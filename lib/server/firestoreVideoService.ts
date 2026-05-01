import { adminDb, adminStorage } from "@/lib/firebaseAdmin";
import { grantDriveAccessToEmail } from "@/lib/server/googleDrive";
import { parseVideo } from "@/utils/urlParser";

export type VideoAccessTier = "free" | "paid";

export interface SaveVideoToFirestoreInput {
  videoId?: string;
  title: string;
  description?: string;
  videoUrl: string;
  sectionId?: string;
  accessTier?: VideoAccessTier;
  thumbnailUrl?: string;
  storagePath?: string;
  storageBucket?: string;
  mimeType?: string;
}

export interface PlayVideoFromFirestoreInput {
  videoId: string;
  user?: {
    uid?: string;
    email?: string | null;
    googleAccessEmail?: string | null;
    tier?: VideoAccessTier | "guest";
  };
  mode: "admin" | "app";
}

function normalizeTier(value: unknown): VideoAccessTier {
  return value === "paid" ? "paid" : "free";
}

async function getSectionRecord(sectionId?: string) {
  if (!sectionId) return null;

  const sectionDoc = await adminDb.collection("videoSections").doc(sectionId).get();
  if (!sectionDoc.exists) return null;

  const data = sectionDoc.data() ?? {};
  return {
    id: sectionDoc.id,
    title: String(data.title || ""),
    accessTier: normalizeTier(data.accessTier),
  };
}

function getEffectiveAccessTier(input: {
  videoAccessTier?: unknown;
  sectionAccessTier?: unknown;
}): VideoAccessTier {
  return input.videoAccessTier === "paid" || input.sectionAccessTier === "paid"
    ? "paid"
    : "free";
}

async function ensureVideoNotDuplicated(
  videoUrl: string,
  driveFileId: string | null,
  sectionId: string,
  existingVideoId?: string
) {
  if (driveFileId) {
    const driveSnapshot = await adminDb
      .collection("videoItems")
      .where("driveFileId", "==", driveFileId)
      .get();

    if (
      driveSnapshot.docs.some(
        (doc) =>
          doc.id !== existingVideoId && (doc.data().sectionId || "") === sectionId
      )
    ) {
      throw new Error("This Drive video is already attached to the selected section");
    }
    return;
  }

  const urlSnapshot = await adminDb
    .collection("videoItems")
    .where("videoUrl", "==", videoUrl)
    .get();

  if (
    urlSnapshot.docs.some(
      (doc) => doc.id !== existingVideoId && (doc.data().sectionId || "") === sectionId
    )
  ) {
    throw new Error("This video is already attached to the selected section");
  }
}

export async function saveVideoToFirestore(input: SaveVideoToFirestoreInput) {
  const title = input.title?.trim();
  const videoUrl = input.videoUrl?.trim();

  if (!title || !videoUrl) {
    throw new Error("Title and video URL are required");
  }

  const parsed = parseVideo(videoUrl);
  const sectionId = input.sectionId || "";
  const section = await getSectionRecord(sectionId);
  const accessTier = normalizeTier(input.accessTier);
  const effectiveAccessTier = getEffectiveAccessTier({
    videoAccessTier: accessTier,
    sectionAccessTier: section?.accessTier,
  });

  await ensureVideoNotDuplicated(
    videoUrl,
    parsed.driveFileId || null,
    sectionId,
    input.videoId
  );

  const payload = {
    title,
    description: input.description?.trim() || "",
    videoUrl,
    provider: parsed.provider,
    driveFileId: parsed.driveFileId || null,
    sectionId,
    accessTier,
    effectiveAccessTier,
    sectionAccessTier: section?.accessTier || "free",
    sectionTitleSnapshot: section?.title || "",
    thumbnailUrl: input.thumbnailUrl?.trim() || "",
    storagePath: input.storagePath?.trim() || "",
    storageBucket: input.storageBucket?.trim() || "",
    mimeType: input.mimeType?.trim() || "",
    updatedAt: new Date(),
  };

  if (input.videoId) {
    await adminDb.collection("videoItems").doc(input.videoId).update(payload);
    return { id: input.videoId, effectiveAccessTier };
  }

  const docRef = await adminDb.collection("videoItems").add({
    ...payload,
    createdAt: new Date(),
  });

  return { id: docRef.id, effectiveAccessTier };
}

async function getStorageSignedUrl(storagePath: string, mimeType?: string) {
  const [url] = await adminStorage.file(storagePath).getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 15,
    responseDisposition: "inline",
    ...(mimeType ? { responseType: mimeType } : {}),
  });

  return url;
}

export async function playVideoFromFirestore(input: PlayVideoFromFirestoreInput) {
  const videoDoc = await adminDb.collection("videoItems").doc(input.videoId).get();

  if (!videoDoc.exists) {
    throw new Error("Video not found");
  }

  const data = videoDoc.data() ?? {};
  const effectiveAccessTier = getEffectiveAccessTier({
    videoAccessTier: data.accessTier,
    sectionAccessTier: data.sectionAccessTier,
  });

  if (
    input.mode === "app" &&
    effectiveAccessTier === "paid" &&
    input.user?.tier !== "paid"
  ) {
    const error = new Error("Paid access required");
    (error as any).status = 403;
    throw error;
  }

  const provider = data.storagePath
    ? "storage"
    : data.provider || "youtube";
  const accessEmail =
    input.user?.googleAccessEmail || input.user?.email || null;

  let playback: Record<string, any>;

  if (provider === "storage" && data.storagePath) {
    const signedUrl = await getStorageSignedUrl(
      String(data.storagePath),
      typeof data.mimeType === "string" ? data.mimeType : undefined
    );

    playback = {
      provider: "storage",
      url: signedUrl,
      mimeType: data.mimeType || "video/mp4",
      storagePath: data.storagePath,
    };
  } else if (provider === "drive" && data.driveFileId) {
    if (effectiveAccessTier === "paid" && accessEmail) {
      await grantDriveAccessToEmail(accessEmail, [data.driveFileId]);
    }

    playback = {
      provider: "drive",
      driveFileId: data.driveFileId,
      previewUrl: `https://drive.google.com/file/d/${data.driveFileId}/preview`,
      webViewUrl: `https://drive.google.com/file/d/${data.driveFileId}/view`,
      streamUrl:
        input.mode === "app"
          ? `/api/app/videos/${videoDoc.id}/stream`
          : `/api/videos/videoItem/${videoDoc.id}/stream`,
      accountEmail: accessEmail,
    };
  } else {
    playback = {
      provider: "youtube",
      url: String(data.videoUrl || ""),
    };
  }

  if (input.user?.uid) {
    await adminDb.collection("videoAccessLogs").add({
      videoId: videoDoc.id,
      userId: input.user.uid,
      userEmail: input.user.email || null,
      accessEmail,
      tier: input.user.tier || null,
      provider,
      accessedAt: new Date().toISOString(),
    });
  }

  return {
    video: {
      id: videoDoc.id,
      title: data.title || "",
      description: data.description || "",
      accessTier: normalizeTier(data.accessTier),
      effectiveAccessTier,
      sectionAccessTier: normalizeTier(data.sectionAccessTier),
      provider,
      sectionId: data.sectionId || "",
      thumbnailUrl: data.thumbnailUrl || "",
      storagePath: data.storagePath || "",
      mimeType: data.mimeType || "",
      requiresGoogleSession: false,
    },
    playback,
    user: input.user
      ? {
          uid: input.user.uid || null,
          tier: input.user.tier || null,
          email: input.user.email || null,
          accountEmail: accessEmail,
        }
      : null,
  };
}
