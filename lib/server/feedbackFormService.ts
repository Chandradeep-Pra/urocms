import { randomBytes } from "crypto";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

export type FeedbackFormRecord = {
  id: string;
  title: string;
  description: string;
  token: string;
  isActive: boolean;
  allowMultipleResponses: boolean;
  submissionCount: number;
  lastSubmittedAt?: unknown;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export type FeedbackResponseRecord = {
  id: string;
  formId: string;
  token: string;
  fullName: string;
  email: string;
  currentInstitute: string;
  currentRole: string;
  examTrack: string;
  feedback: string;
  submittedAt?: unknown;
};

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeBoolean(value: unknown, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function normalizeEmail(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function mapFeedbackForm(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot
) {
  const data = doc.data() ?? {};

  return {
    id: doc.id,
    title: normalizeString(data.title),
    description: normalizeString(data.description),
    token: normalizeString(data.token),
    isActive: normalizeBoolean(data.isActive, false),
    allowMultipleResponses: normalizeBoolean(data.allowMultipleResponses, true),
    submissionCount: Number(data.submissionCount ?? 0) || 0,
    lastSubmittedAt: data.lastSubmittedAt,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  } satisfies FeedbackFormRecord;
}

function mapFeedbackResponse(
  doc: FirebaseFirestore.QueryDocumentSnapshot | FirebaseFirestore.DocumentSnapshot
) {
  const data = doc.data() ?? {};

  return {
    id: doc.id,
    formId: normalizeString(data.formId),
    token: normalizeString(data.token),
    fullName: normalizeString(data.fullName),
    email: normalizeEmail(data.email),
    currentInstitute: normalizeString(data.currentInstitute),
    currentRole: normalizeString(data.currentRole),
    examTrack: normalizeString(data.examTrack),
    feedback: normalizeString(data.feedback),
    submittedAt: data.submittedAt,
  } satisfies FeedbackResponseRecord;
}

async function generateUniqueToken() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const token = `fb_${randomBytes(6).toString("base64url")}`;
    const snapshot = await adminDb
      .collection("feedbackForms")
      .where("token", "==", token)
      .limit(1)
      .get();

    if (snapshot.empty) {
      return token;
    }
  }

  throw new Error("Unable to generate a unique feedback token");
}

export async function listFeedbackForms() {
  const snapshot = await adminDb
    .collection("feedbackForms")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map(mapFeedbackForm);
}

export async function getFeedbackFormById(id: string) {
  const doc = await adminDb.collection("feedbackForms").doc(id).get();
  if (!doc.exists) {
    throw new Error("Feedback form not found");
  }

  return mapFeedbackForm(doc);
}

export async function findFeedbackFormByToken(token: string) {
  const normalizedToken = normalizeString(token);
  if (!normalizedToken) return null;

  const snapshot = await adminDb
    .collection("feedbackForms")
    .where("token", "==", normalizedToken)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return null;
  }

  return mapFeedbackForm(snapshot.docs[0]);
}

export async function createFeedbackForm(input: Record<string, unknown>) {
  const title = normalizeString(input.title);
  const description = normalizeString(input.description);
  const isActive = normalizeBoolean(input.isActive, true);
  const allowMultipleResponses = normalizeBoolean(
    input.allowMultipleResponses,
    true
  );

  if (!title) {
    throw new Error("Title is required");
  }

  const token = await generateUniqueToken();
  const docRef = await adminDb.collection("feedbackForms").add({
    title,
    description,
    token,
    isActive,
    allowMultipleResponses,
    submissionCount: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const doc = await docRef.get();
  return mapFeedbackForm(doc);
}

export async function updateFeedbackForm(id: string, input: Record<string, unknown>) {
  const current = await getFeedbackFormById(id);

  const title = normalizeString(input.title) || current.title;
  const description =
    input.description === undefined
      ? current.description
      : normalizeString(input.description);
  const isActive =
    input.isActive === undefined
      ? current.isActive
      : normalizeBoolean(input.isActive, current.isActive);
  const allowMultipleResponses =
    input.allowMultipleResponses === undefined
      ? current.allowMultipleResponses
      : normalizeBoolean(
          input.allowMultipleResponses,
          current.allowMultipleResponses
        );

  if (!title) {
    throw new Error("Title is required");
  }

  await adminDb.collection("feedbackForms").doc(id).update({
    title,
    description,
    isActive,
    allowMultipleResponses,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return getFeedbackFormById(id);
}

export async function deleteFeedbackForm(id: string) {
  await adminDb.collection("feedbackForms").doc(id).delete();
  return { success: true };
}

export async function listFeedbackResponses(formId: string) {
  const snapshot = await adminDb
    .collection("feedbackResponses")
    .where("formId", "==", formId)
    .orderBy("submittedAt", "desc")
    .get();

  return snapshot.docs.map(mapFeedbackResponse);
}

export async function listPublishableFeedbackResponses() {
  const snapshot = await adminDb
    .collection("feedbackResponses")
    .orderBy("submittedAt", "desc")
    .get();

  return snapshot.docs.map(mapFeedbackResponse);
}

export async function submitFeedbackResponse(
  token: string,
  input: Record<string, unknown>
) {
  const form = await findFeedbackFormByToken(token);

  if (!form) {
    throw new Error("Feedback link not found");
  }

  if (!form.isActive) {
    throw new Error("This feedback link is no longer active");
  }

  const fullName = normalizeString(input.fullName);
  const email = normalizeEmail(input.email);
  const currentInstitute = normalizeString(input.currentInstitute);
  const currentRole = normalizeString(input.currentRole);
  const examTrack = normalizeString(input.examTrack);
  const feedback = normalizeString(input.feedback);

  if (!fullName) {
    throw new Error("Full name is required");
  }

  if (!email) {
    throw new Error("Email is required");
  }

  if (!currentInstitute) {
    throw new Error("Current institute or trust is required");
  }

  if (!feedback) {
    throw new Error("Feedback is required");
  }

  if (!form.allowMultipleResponses) {
    const existing = await adminDb
      .collection("feedbackResponses")
      .where("formId", "==", form.id)
      .where("email", "==", email)
      .limit(1)
      .get();

    if (!existing.empty) {
      throw new Error("A response has already been submitted for this email");
    }
  }

  const docRef = await adminDb.collection("feedbackResponses").add({
    formId: form.id,
    token: form.token,
    fullName,
    email,
    currentInstitute,
    currentRole,
    examTrack,
    feedback,
    submittedAt: FieldValue.serverTimestamp(),
  });

  await adminDb.collection("feedbackForms").doc(form.id).update({
    submissionCount: FieldValue.increment(1),
    lastSubmittedAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  const responseDoc = await docRef.get();

  return {
    form,
    response: mapFeedbackResponse(responseDoc),
  };
}
