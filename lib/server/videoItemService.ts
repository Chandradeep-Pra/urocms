import { adminDb } from "@/lib/firebaseAdmin";
import {
  deleteVideoAssetsFromStorage,
  saveVideoToFirestore,
} from "@/lib/server/firestoreVideoService";

export interface VideoItemInput {
  title: string;
  description?: string;
  videoUrl: string;
  sectionId?: string;
  accessTier?: "free" | "paid";
  thumbnailUrl?: string;
}

export async function listVideoItems(sectionId?: string) {
  let query = adminDb.collection("videoItems");

  if (sectionId) {
    query = query.where("sectionId", "==", sectionId);
  }

  const snapshot = await query.get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    accessTier: doc.data().accessTier === "paid" ? "paid" : "free",
    thumbnailUrl: doc.data().thumbnailUrl || "",
    ...doc.data(),
  }));
}

async function ensureVideoNotDuplicated(
  videoUrl: string,
  driveFileId: string | null,
  sectionId: string
) {
  if (driveFileId) {
    const driveSnapshot = await adminDb
      .collection("videoItems")
      .where("driveFileId", "==", driveFileId)
      .get();

    if (driveSnapshot.docs.some((doc) => (doc.data().sectionId || "") === sectionId)) {
      throw new Error("This Drive video is already attached to the selected section");
    }
    return;
  }

  const urlSnapshot = await adminDb
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
  const docRef = adminDb.collection("videoItems").doc(id);
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
