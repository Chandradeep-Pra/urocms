import { extname } from "path";
import { Readable } from "stream";
import { pipeline } from "stream/promises";
import {
  getAdminDb,
} from "@/lib/firebaseAdmin";
import {
  fetchDriveFileStream,
  getDriveFileDebugInfo,
  getDriveFileMetadata,
  getDriveServiceAccountDebugInfo,
  grantDriveAccessToEmail,
} from "@/lib/server/googleDrive";
import {
  deleteCloudStorageObject,
  getCloudStorageSignedReadUrl,
  getResolvedGoogleCloudStorageBucket,
  sanitizeStoragePathPart,
} from "@/lib/server/googleCloudStorage";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import type { AppUserSession } from "@/lib/server/appSession";
import { parseVideo } from "@/utils/urlParser";

export type VideoAccessTier = "free" | "paid";

export interface SaveVideoToFirestoreInput {
  videoId?: string;
  title: string;
  description?: string;
  videoUrl: string;
  sectionId?: string;
  accessTier?: VideoAccessTier;
  sortOrder?: number;
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

function getExtensionFromMetadata(name: string, mimeType: string) {
  const existingExtension = extname(name || "").trim();
  if (existingExtension) return existingExtension;

  if (mimeType === "video/mp4") return ".mp4";
  if (mimeType === "video/quicktime") return ".mov";
  if (mimeType === "video/x-matroska") return ".mkv";
  if (mimeType === "video/webm") return ".webm";

  return ".mp4";
}

function normalizeTier(value: unknown): VideoAccessTier {
  return value === "paid" ? "paid" : "free";
}

function normalizeSortOrder(value: unknown, fallback = 0) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

async function getSectionRecord(sectionId?: string) {
  if (!sectionId) return null;

  const sectionDoc = await getAdminDb().collection("videoSections").doc(sectionId).get();
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
    const driveSnapshot = await getAdminDb()
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

  const urlSnapshot = await getAdminDb()
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

async function getNextVideoSortOrder(sectionId: string, excludingVideoId?: string) {
  const snapshot = await getAdminDb().collection("videoItems").get();

  return (
    snapshot.docs
      .filter((doc) => doc.id !== excludingVideoId && String(doc.data().sectionId || "") === sectionId)
      .reduce((max, doc) => Math.max(max, normalizeSortOrder(doc.data().sortOrder, 0)), 0) + 1
  );
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
  const existingDoc = input.videoId
    ? await getAdminDb().collection("videoItems").doc(input.videoId).get()
    : null;
  const existingData = existingDoc?.exists ? existingDoc.data() ?? {} : {};
  const previousSectionId = String(existingData.sectionId || "");
  const sourceChanged =
    Boolean(input.videoId) &&
    (
      String(existingData.videoUrl || "").trim() !== videoUrl ||
      String(existingData.driveFileId || "").trim() !== String(parsed.driveFileId || "").trim() ||
      String(existingData.provider || "").trim() !== String(parsed.provider || "").trim()
    );

  await ensureVideoNotDuplicated(
    videoUrl,
    parsed.driveFileId || null,
    sectionId,
    input.videoId
  );

  let resolvedSortOrder: number;
  const requestedSortOrder = normalizeSortOrder(input.sortOrder, 0);
  if (requestedSortOrder > 0) {
    resolvedSortOrder = requestedSortOrder;
  } else if (input.videoId) {
    const existingSortOrder = normalizeSortOrder(existingData.sortOrder, 0);
    resolvedSortOrder =
      previousSectionId !== sectionId
        ? await getNextVideoSortOrder(sectionId, input.videoId)
        : existingSortOrder || (await getNextVideoSortOrder(sectionId, input.videoId));
  } else {
    resolvedSortOrder = await getNextVideoSortOrder(sectionId);
  }

  const payload = {
    title,
    description: input.description?.trim() || "",
    videoUrl,
    provider: parsed.provider,
    driveFileId: parsed.driveFileId || null,
    sectionId,
    accessTier,
    effectiveAccessTier,
    sortOrder: resolvedSortOrder,
    sectionAccessTier: section?.accessTier || "free",
    sectionTitleSnapshot: section?.title || "",
    thumbnailUrl: input.thumbnailUrl?.trim() || "",
    storagePath:
      typeof input.storagePath === "string"
        ? input.storagePath.trim()
        : sourceChanged
          ? ""
          : String(existingData.storagePath || ""),
    storageBucket:
      typeof input.storageBucket === "string"
        ? input.storageBucket.trim()
        : sourceChanged
          ? ""
          : String(existingData.storageBucket || ""),
    mimeType:
      typeof input.mimeType === "string"
        ? input.mimeType.trim()
        : sourceChanged
          ? ""
          : String(existingData.mimeType || ""),
    updatedAt: new Date(),
  };

  if (input.videoId) {
    await getAdminDb().collection("videoItems").doc(input.videoId).update(payload);
    return { id: input.videoId, effectiveAccessTier };
  }

  const docRef = await getAdminDb().collection("videoItems").add({
    ...payload,
    createdAt: new Date(),
  });

  return { id: docRef.id, effectiveAccessTier };
}

export async function syncDriveVideoToStorage(videoId: string) {
  const videoRef = getAdminDb().collection("videoItems").doc(videoId);
  const videoDoc = await videoRef.get();

  if (!videoDoc.exists) {
    throw new Error("Video not found");
  }

  const data = videoDoc.data() ?? {};
  if (data.provider !== "drive" || !data.driveFileId) {
    throw new Error("Only Drive videos can be synced to Google Cloud Storage");
  }

  if (data.storagePath) {
    return {
      id: videoId,
      storagePath: String(data.storagePath),
      alreadySynced: true,
    };
  }

  const metadata = await getDriveFileMetadata(String(data.driveFileId));
  const driveServiceAccountDebug = getDriveServiceAccountDebugInfo();
  const driveFileDebug = await getDriveFileDebugInfo(String(data.driveFileId));
  console.log("Video sync Drive service account:", driveServiceAccountDebug);
  console.log("Video sync Drive file debug info:", driveFileDebug);
  const extension = getExtensionFromMetadata(metadata.name, metadata.mimeType);
  const titlePart = sanitizeStoragePathPart(String(data.title || metadata.name || "video"));
  const filename = `${titlePart || "video"}${extension}`;
  const sectionPart = sanitizeStoragePathPart(
    String(data.sectionTitleSnapshot || data.sectionId || "unassigned")
  );
  const storagePath = `videos/${sectionPart || "unassigned"}/${videoId}/${Date.now()}-${filename}`;

  const upstream = await fetchDriveFileStream(String(data.driveFileId));
  if (!upstream.body) {
    throw new Error("Drive response did not include a stream body");
  }

  const bucket = await getResolvedGoogleCloudStorageBucket();

  const uploadStream = bucket.file(storagePath).createWriteStream({
    resumable: false,
    metadata: {
      contentType: metadata.mimeType || "video/mp4",
      cacheControl: "private, max-age=3600",
    },
  });

  await pipeline(Readable.fromWeb(upstream.body as never), uploadStream);

  await videoRef.update({
    storagePath,
    storageBucket: bucket.name,
    mimeType: metadata.mimeType || data.mimeType || "video/mp4",
    updatedAt: new Date(),
    syncedToStorageAt: new Date(),
  });

  return {
    id: videoId,
    storagePath,
    storageBucket: bucket.name,
    mimeType: metadata.mimeType || "video/mp4",
    alreadySynced: false,
  };
}

export async function playVideoFromFirestore(input: PlayVideoFromFirestoreInput) {
  const videoDoc = await getAdminDb().collection("videoItems").doc(input.videoId).get();

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
    input.user
  ) {
    const accessContext = await buildAppContentAccessContext(input.user as AppUserSession);
    const access = accessContext.getVideoAccess({
      id: videoDoc.id,
      sectionId: typeof data.sectionId === "string" ? data.sectionId : null,
      effectiveAccessTier,
      accessTier: normalizeTier(data.accessTier),
    });

    if (access.mode !== "full") {
      const error = new Error(access.reason || "Video access is locked");
      (error as any).status = 403;
      throw error;
    }
  }

  const provider = data.storagePath
    ? "storage"
    : data.provider || "youtube";
  const accessEmail =
    input.user?.googleAccessEmail || input.user?.email || null;

  let playback: Record<string, any>;

  if (provider === "storage" && data.storagePath) {
    const signedUrl = await getCloudStorageSignedReadUrl({
      storagePath: String(data.storagePath),
      mimeType: typeof data.mimeType === "string" ? data.mimeType : undefined,
      storageBucket:
        typeof data.storageBucket === "string" ? data.storageBucket : undefined,
    });

    playback = {
      provider: "storage",
      url: signedUrl.url,
      mimeType: data.mimeType || "video/mp4",
      storagePath: data.storagePath,
      storageBucket: signedUrl.bucket,
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
    await getAdminDb().collection("videoAccessLogs").add({
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
      storageBucket: data.storageBucket || "",
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

export async function deleteVideoAssetsFromStorage(input: {
  storagePath?: string | null;
  storageBucket?: string | null;
}) {
  return deleteCloudStorageObject(input);
}
