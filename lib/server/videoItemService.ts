import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  deleteVideoAssetsFromStorage,
  saveVideoToFirestore,
} from "@/lib/server/firestoreVideoService";
import type { DocumentData, Query } from "firebase-admin/firestore";

type VideoDocument = Record<string, unknown> & {
  sectionId?: unknown;
  title?: unknown;
  thumbnailUrl?: unknown;
};

export interface VideoItemInput {
  title: string;
  description?: string;
  videoUrl: string;
  sectionId?: string;
  accessTier?: "free" | "paid";
  sortOrder?: number;
  thumbnailUrl?: string;
}

function normalizeSortOrder(value: unknown, fallback: number) {
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

export async function listVideoItems(sectionId?: string) {
  let query: Query<DocumentData> = getAdminDb().collection("videoItems");

  if (sectionId) {
    query = query.where("sectionId", "==", sectionId);
  }

  const snapshot = await query.get();

  return snapshot.docs
    .map((doc, index) => {
      const data = doc.data() as VideoDocument;
      return ({
      id: doc.id,
      ...data,
      accessTier: data.accessTier === "paid" ? "paid" : "free",
      thumbnailUrl: typeof data.thumbnailUrl === "string" ? data.thumbnailUrl : "",
      sortOrder: normalizeSortOrder(data.sortOrder, index + 1),
    });
    })
    .sort((a, b) => {
      const sectionA = String(a.sectionId || "");
      const sectionB = String(b.sectionId || "");

      if (!sectionId && sectionA !== sectionB) {
        return sectionA.localeCompare(sectionB);
      }

      const orderA = normalizeSortOrder(a.sortOrder, 0);
      const orderB = normalizeSortOrder(b.sortOrder, 0);

      if (orderA !== orderB) {
        return orderA - orderB;
      }

      return String(a.title || "").localeCompare(String(b.title || ""));
    });
}

async function ensureVideoNotDuplicated(
  videoUrl: string,
  driveFileId: string | null,
  sectionId: string
) {
  if (driveFileId) {
    const driveSnapshot = await getAdminDb()
      .collection("videoItems")
      .where("driveFileId", "==", driveFileId)
      .get();

    if (driveSnapshot.docs.some((doc) => (doc.data().sectionId || "") === sectionId)) {
      throw new Error("This Drive video is already attached to the selected section");
    }
    return;
  }

  const urlSnapshot = await getAdminDb()
    .collection("videoItems")
    .where("videoUrl", "==", videoUrl)
    .get();

  if (urlSnapshot.docs.some((doc) => (doc.data().sectionId || "") === sectionId)) {
    throw new Error("This video is already attached to the selected section");
  }
}

export async function createVideoItem(input: VideoItemInput) {
  return saveVideoToFirestore(input);
}

export async function updateVideoItem(id: string, input: VideoItemInput) {
  return saveVideoToFirestore({ ...input, videoId: id });
}

export async function deleteVideoItem(id: string) {
  const docRef = getAdminDb().collection("videoItems").doc(id);
  const snapshot = await docRef.get();

  if (!snapshot.exists) {
    throw new Error("Video not found");
  }

  const data = snapshot.data() ?? {};

  if (data.storagePath) {
    await deleteVideoAssetsFromStorage({
      storagePath: typeof data.storagePath === "string" ? data.storagePath : null,
      storageBucket: typeof data.storageBucket === "string" ? data.storageBucket : null,
    });
  }

  await docRef.delete();
  return { success: true };
}
