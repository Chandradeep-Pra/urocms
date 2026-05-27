import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

export type TestimonialRecord = {
  id: string;
  title: string;
  videoUrl: string;
  youtubeId: string;
  candidateName: string;
  candidateRole: string;
  quote: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeSortOrder(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

export function extractYoutubeId(input: string): string | null {
  if (!input) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) {
    return input;
  }

  try {
    const url = new URL(input);

    if (url.hostname === "youtu.be") {
      return url.pathname.replace("/", "") || null;
    }

    const vParam = url.searchParams.get("v");
    if (vParam) {
      return vParam;
    }

    if (url.pathname.includes("/embed/")) {
      return url.pathname.split("/embed/")[1] || null;
    }

    return null;
  } catch {
    return null;
  }
}

function buildYoutubeUrl(value: string) {
  const youtubeId = extractYoutubeId(value);
  if (!youtubeId) {
    throw new Error("Valid YouTube URL or video ID is required");
  }

  return {
    youtubeId,
    videoUrl: `https://www.youtube.com/watch?v=${youtubeId}`,
  };
}

function mapTestimonial(doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot) {
  const data = doc.data() ?? {};

  return {
    id: doc.id,
    title: normalizeString(data.title),
    videoUrl: normalizeString(data.videoUrl),
    youtubeId: normalizeString(data.youtubeId),
    candidateName: normalizeString(data.candidateName),
    candidateRole: normalizeString(data.candidateRole),
    quote: normalizeString(data.quote),
    sortOrder: normalizeSortOrder(data.sortOrder),
    isActive: Boolean(data.isActive),
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } satisfies TestimonialRecord;
}

export async function listPublicTestimonials() {
  const snapshot = await adminDb
    .collection("testimonials")
    .where("isActive", "==", true)
    .orderBy("sortOrder", "asc")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map(mapTestimonial);
}

export async function listAllTestimonials() {
  const snapshot = await adminDb
    .collection("testimonials")
    .orderBy("sortOrder", "asc")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map(mapTestimonial);
}

export async function createTestimonial(input: Record<string, unknown>) {
  const title = normalizeString(input.title);
  const candidateName = normalizeString(input.candidateName);
  const candidateRole = normalizeString(input.candidateRole);
  const quote = normalizeString(input.quote);
  const sortOrder = normalizeSortOrder(input.sortOrder);
  const isActive = input.isActive !== false;
  const sourceVideo = normalizeString(input.videoUrl || input.youtubeId);

  if (!title) {
    throw new Error("Title is required");
  }

  if (!sourceVideo) {
    throw new Error("YouTube URL is required");
  }

  const { youtubeId, videoUrl } = buildYoutubeUrl(sourceVideo);

  const docRef = await adminDb.collection("testimonials").add({
    title,
    candidateName,
    candidateRole,
    quote,
    sortOrder,
    isActive,
    youtubeId,
    videoUrl,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const doc = await docRef.get();
  return mapTestimonial(doc);
}

export async function updateTestimonial(id: string, input: Record<string, unknown>) {
  const title = normalizeString(input.title);
  const candidateName = normalizeString(input.candidateName);
  const candidateRole = normalizeString(input.candidateRole);
  const quote = normalizeString(input.quote);
  const sortOrder = normalizeSortOrder(input.sortOrder);
  const isActive = input.isActive !== false;
  const sourceVideo = normalizeString(input.videoUrl || input.youtubeId);

  if (!title) {
    throw new Error("Title is required");
  }

  if (!sourceVideo) {
    throw new Error("YouTube URL is required");
  }

  const { youtubeId, videoUrl } = buildYoutubeUrl(sourceVideo);

  await adminDb.collection("testimonials").doc(id).update({
    title,
    candidateName,
    candidateRole,
    quote,
    sortOrder,
    isActive,
    youtubeId,
    videoUrl,
    updatedAt: FieldValue.serverTimestamp(),
  });

  const doc = await adminDb.collection("testimonials").doc(id).get();
  if (!doc.exists) {
    throw new Error("Testimonial not found");
  }

  return mapTestimonial(doc);
}

export async function deleteTestimonial(id: string) {
  await adminDb.collection("testimonials").doc(id).delete();
  return { success: true };
}
