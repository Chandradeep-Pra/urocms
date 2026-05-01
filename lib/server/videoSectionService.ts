import { adminDb } from "@/lib/firebaseAdmin";

export type VideoSectionAccessTier = "free" | "paid";

export interface VideoSectionRecord {
  id: string;
  title: string;
  accessTier: VideoSectionAccessTier;
}

export async function listVideoSections(): Promise<VideoSectionRecord[]> {
  const snapshot = await adminDb.collection("videoSections").get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    title: String(doc.data().title || ""),
    accessTier: doc.data().accessTier === "paid" ? "paid" : "free",
  }));
}

export async function createVideoSection(input: {
  title: string;
  accessTier?: VideoSectionAccessTier;
}) {
  const title = input.title?.trim();
  if (!title) {
    throw new Error("Title required");
  }

  const accessTier = input.accessTier === "paid" ? "paid" : "free";

  const docRef = await adminDb.collection("videoSections").add({
    title,
    accessTier,
    createdAt: new Date(),
  });

  return { id: docRef.id };
}

export async function updateVideoSection(
  id: string,
  input: { title?: string; accessTier?: VideoSectionAccessTier }
) {
  const sectionRef = adminDb.collection("videoSections").doc(id);
  const currentSectionDoc = await sectionRef.get();
  const currentSection = currentSectionDoc.data() ?? {};

  const nextTitle =
    typeof input.title === "string" ? input.title.trim() : String(currentSection.title || "");
  const nextAccessTier =
    input.accessTier === "paid" || currentSection.accessTier === "paid"
      ? (input.accessTier === "paid" ? "paid" : currentSection.accessTier === "paid" ? "paid" : "free")
      : "free";

  const payload: Record<string, unknown> = {
    updatedAt: new Date(),
  };

  if (typeof input.title === "string") {
    if (!nextTitle) {
      throw new Error("Title required");
    }
    payload.title = nextTitle;
  }

  if (input.accessTier) {
    payload.accessTier = input.accessTier === "paid" ? "paid" : "free";
  }

  const videosSnapshot = await adminDb
    .collection("videoItems")
    .where("sectionId", "==", id)
    .get();

  const batch = adminDb.batch();
  batch.update(sectionRef, payload);

  videosSnapshot.docs.forEach((doc) => {
    const video = doc.data() ?? {};
    const videoAccessTier = video.accessTier === "paid" ? "paid" : "free";
    const effectiveAccessTier =
      videoAccessTier === "paid" || nextAccessTier === "paid" ? "paid" : "free";

    batch.update(doc.ref, {
      sectionTitleSnapshot: nextTitle,
      sectionAccessTier: nextAccessTier,
      effectiveAccessTier,
      updatedAt: new Date(),
    });
  });

  await batch.commit();
  return { success: true };
}

export async function deleteVideoSection(id: string) {
  const videosSnapshot = await adminDb
    .collection("videoItems")
    .where("sectionId", "==", id)
    .get();

  const batch = adminDb.batch();

  videosSnapshot.docs.forEach((doc) => {
    batch.update(doc.ref, {
      sectionId: "",
      updatedAt: new Date(),
    });
  });

  batch.delete(adminDb.collection("videoSections").doc(id));
  await batch.commit();

  return { success: true };
}
