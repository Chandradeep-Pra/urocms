import { adminDb } from "@/lib/firebaseAdmin";

export type VideoSectionAccessTier = "free" | "paid";

export interface VideoSectionRecord {
  id: string;
  title: string;
  accessTier: VideoSectionAccessTier;
  sortOrder: number;
  imageUrl: string;
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

export async function listVideoSections(): Promise<VideoSectionRecord[]> {
  const snapshot = await adminDb.collection("videoSections").get();

  return snapshot.docs
    .map((doc, index) => ({
      id: doc.id,
      title: String(doc.data().title || ""),
      accessTier: doc.data().accessTier === "paid" ? "paid" : "free",
      sortOrder: normalizeSortOrder(doc.data().sortOrder, index + 1),
      imageUrl: String(
        doc.data().imageUrl || doc.data().folderImageUrl || doc.data().thumbnailUrl || ""
      ),
    }))
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return a.title.localeCompare(b.title);
    });
}

export async function createVideoSection(input: {
  title: string;
  accessTier?: VideoSectionAccessTier;
  sortOrder?: number;
}) {
  const title = input.title?.trim();
  if (!title) {
    throw new Error("Title required");
  }

  const accessTier = input.accessTier === "paid" ? "paid" : "free";
  const requestedSortOrder = normalizeSortOrder(input.sortOrder, 0);
  const sections = await listVideoSections();
  const nextSortOrder =
    requestedSortOrder > 0
      ? requestedSortOrder
      : sections.reduce((max, section) => Math.max(max, section.sortOrder), 0) + 1;

  const docRef = await adminDb.collection("videoSections").add({
    title,
    accessTier,
    sortOrder: nextSortOrder,
    createdAt: new Date(),
  });

  return { id: docRef.id };
}

export async function updateVideoSection(
  id: string,
  input: {
    title?: string;
    accessTier?: VideoSectionAccessTier;
    sortOrder?: number;
    imageUrl?: string;
  }
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

  if ("imageUrl" in input) {
    const imageUrl =
      typeof input.imageUrl === "string" ? input.imageUrl.trim() : "";
    payload.imageUrl = imageUrl;
    payload.folderImageUrl = imageUrl;
  }

  const requestedSortOrder = normalizeSortOrder(input.sortOrder, 0);
  if (requestedSortOrder > 0) {
    payload.sortOrder = requestedSortOrder;
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
