import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

export type TestimonialRecord = {
  id: string;
  title: string;
  videoUrl: string;
  youtubeId: string;
  imageUrl: string;
  candidateName: string;
  candidateRole: string;
  companyName: string;
  quote: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
};

function normalizeString(value: unknown) {
  const normalized = String(value ?? "").trim();

  if (!normalized) {
    return "";
  }

  const lower = normalized.toLowerCase();
  if (lower === "undefined" || lower === "null") {
    return "";
  }

  return normalized;
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
  const normalizedValue = normalizeString(value);
  if (!normalizedValue) {
    return {
      youtubeId: "",
      videoUrl: "",
    };
  }

  const youtubeId = extractYoutubeId(normalizedValue);
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
    imageUrl: normalizeString(data.imageUrl),
    candidateName: normalizeString(data.candidateName),
    candidateRole: normalizeString(data.candidateRole),
    companyName: normalizeString(data.companyName),
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
  const companyName = normalizeString(input.companyName);
  const quote = normalizeString(input.quote);
  const sortOrder = normalizeSortOrder(input.sortOrder);
  const isActive = input.isActive !== false;
  const sourceVideo = normalizeString(input.videoUrl || input.youtubeId);
  const imageUrl = normalizeString(input.imageUrl);

  if (!title && !candidateName) {
    throw new Error("Either title or candidate name is required");
  }

  if (!quote) {
    throw new Error("Quote is required");
  }

  const { youtubeId, videoUrl } = buildYoutubeUrl(sourceVideo);

  const docRef = await adminDb.collection("testimonials").add({
    title,
    candidateName,
    candidateRole,
    companyName,
    quote,
    sortOrder,
    isActive,
    youtubeId,
    videoUrl,
    imageUrl,
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
  const companyName = normalizeString(input.companyName);
  const quote = normalizeString(input.quote);
  const sortOrder = normalizeSortOrder(input.sortOrder);
  const isActive = input.isActive !== false;
  const sourceVideo = normalizeString(input.videoUrl || input.youtubeId);
  const imageUrl = normalizeString(input.imageUrl);

  if (!title && !candidateName) {
    throw new Error("Either title or candidate name is required");
  }

  if (!quote) {
    throw new Error("Quote is required");
  }

  const { youtubeId, videoUrl } = buildYoutubeUrl(sourceVideo);

  await adminDb.collection("testimonials").doc(id).update({
    title,
    candidateName,
    candidateRole,
    companyName,
    quote,
    sortOrder,
    isActive,
    youtubeId,
    videoUrl,
    imageUrl,
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
