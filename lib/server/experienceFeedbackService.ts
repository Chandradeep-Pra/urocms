import { createHash } from "node:crypto";
import { FieldPath } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import type { AppUserSession } from "@/lib/server/appSession";
import type { ExperienceFeedbackKind, FeedbackCategory, FeedbackInboxItem, FeedbackInboxResponse, FeedbackPlatform } from "@/lib/experienceFeedback";

const CATEGORIES = [
  { key: "webapp", label: "Webapp Feedbacks", collection: "webapp_feedbacks" },
  { key: "mock", label: "Mock Feedbacks", collection: "mock_feedbacks" },
  { key: "viva", label: "Viva Feedbacks", collection: "viva_feedbacks" },
  { key: "app", label: "App Feedbacks", collection: "app_feedbacks" },
] as const;
const RATING_LABELS: Record<string, string> = {
  questions: "Questions", appExperience: "App experience", overallViva: "Overall viva",
};
const record = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
const text = (value: unknown) => typeof value === "string" ? value.trim() : "";
const emailOf = (value: unknown) => text(value).toLowerCase();

export class FeedbackError extends Error {
  constructor(message: string, public status = 400) { super(message); }
}

function rating(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 1 || value > 5) {
    throw new FeedbackError(`${label} must be a whole number from 1 to 5.`);
  }
  return value;
}

function optionalComment(value: unknown): string | null {
  if (value !== undefined && value !== null && typeof value !== "string") throw new FeedbackError("Comments must be text.");
  const result = text(value);
  if (result.length > 2000) throw new FeedbackError("Comments must be 2,000 characters or fewer.");
  return result || null;
}

function parseSubmission(value: unknown) {
  const input = record(value);
  if (!["mock", "viva", "webapp", "app"].includes(text(input.kind))) throw new FeedbackError("Choose a valid feedback kind.");
  const kind = input.kind as ExperienceFeedbackKind;
  const submissionId = text(input.submissionId);
  if (!/^[a-zA-Z0-9_-]{8,128}$/.test(submissionId)) throw new FeedbackError("A valid submissionId is required.");
  const assessment = kind === "mock" || kind === "viva";
  const contextId = assessment ? text(input.contextId) : null;
  if (assessment && !/^[^/\\\u0000-\u001f]{1,180}$/.test(contextId || "")) throw new FeedbackError("A valid contextId is required.");
  const ratings: Record<string, number> = {};
  if (kind === "mock") {
    ratings.questions = rating(input.questionsRating, "Questions rating");
    ratings.appExperience = rating(input.appRating, "App experience rating");
  } else if (kind === "viva") ratings.overallViva = rating(input.vivaRating, "Viva rating");
  else ratings.appExperience = rating(input.appRating, "App experience rating");
  const reason = optionalComment(input.reason);
  const comment = optionalComment(input.comment);
  const candidate = record(input.candidate);
  const name = text(candidate.name);
  const email = emailOf(candidate.email);
  if (name.length > 160 || email.length > 254 || email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new FeedbackError("Candidate details are invalid.");
  return { kind, submissionId, contextId, ratings, reason: kind === "mock" && ratings.questions < 3 ? reason : null, comment, candidate: { name, email } };
}

async function feedbackContext(input: ReturnType<typeof parseSubmission>, user: AppUserSession | null, email: string) {
  if (input.kind === "webapp" || input.kind === "app") return null;
  const snapshot = await getAdminDb().collection(input.kind === "mock" ? "mocks" : "vivaCases").doc(input.contextId!).get();
  if (!snapshot.exists) throw new FeedbackError("This assessment could not be found.", 404);
  const data = snapshot.data() ?? {};
  if (!user && data.accessType !== "public") throw new FeedbackError("Sign in to send feedback for this assessment.", 403);
  if (user && data.accessType !== "public") {
    const accessContext = await buildAppContentAccessContext(user);
    const access = input.kind === "mock"
      ? accessContext.getMockAccess({ id: input.contextId!, type: String(data.type || "mock"), accessType: String(data.accessType || "restricted") })
      : accessContext.getVivaAccess({ id: input.contextId!, folderId: typeof data.folderId === "string" ? data.folderId : null, accessType: "restricted" });
    if (!access.allowed || access.mode === "locked") throw new FeedbackError("You do not have access to this assessment.", 403);
  }
  if (input.kind === "mock") {
    const attempts: unknown[] = [...(Array.isArray(data.attempts) ? data.attempts : []), ...(Array.isArray(data.history) ? data.history : [])];
    let completed = attempts.some(value => {
      const attempt = record(value), candidate = record(attempt.candidate);
      return Boolean(email && emailOf(candidate.email || attempt.email) === email || user && candidate.uid === user.uid);
    });
    if (!completed && user) completed = (await getAdminDb().collection("mockAttempts").doc(user.uid).collection("items").doc(input.contextId!).get()).exists;
    if (!completed) throw new FeedbackError("Submit the mock before sending feedback.", 403);
  } else if (!user) {
    const participants: unknown[] = Array.isArray(data.publicParticipants) ? data.publicParticipants : [];
    if (!email || !participants.some(value => emailOf(record(value).email) === email)) throw new FeedbackError("Start the viva before sending feedback.", 403);
  }
  return text(record(data.case).title || data.title) || null;
}

export async function submitExperienceFeedback(value: unknown, options: { platform: FeedbackPlatform; user: AppUserSession | null }) {
  const input = parseSubmission(value);
  if (input.kind === "app" && options.platform !== "mobile") throw new FeedbackError("Mobile app feedback requires the mobile platform.");
  const email = emailOf(options.user?.email || input.candidate.email);
  const contextTitle = await feedbackContext(input, options.user, email);
  const category: FeedbackCategory = options.platform === "mobile" ? "app" : input.kind;
  const definition = CATEGORIES.find(item => item.key === category)!;
  const id = createHash("sha256").update(JSON.stringify([options.platform, input.kind, options.user?.uid || email || "anonymous", input.contextId, input.submissionId])).digest("hex");
  const ref = getAdminDb().collection(definition.collection).doc(id);
  const result = await getAdminDb().runTransaction(async transaction => {
    if ((await transaction.get(ref)).exists) return { alreadyRecorded: true };
    transaction.create(ref, {
      submissionId: input.submissionId, category, kind: input.kind, platform: options.platform,
      contextId: input.contextId, contextTitle,
      candidate: { uid: options.user?.uid || null, name: text(options.user?.name || input.candidate.name) || null, email: email || null },
      ratings: input.ratings, reason: input.reason, comment: input.comment,
      submittedAt: new Date().toISOString(),
    });
    return { alreadyRecorded: false };
  });
  return { success: true, id, ...result };
}

type Position = { time: string; id: string };
type Cursor = { category: string; positions: Partial<Record<FeedbackCategory, Position>> };

function decodeCursor(value: string | null, category: string): Cursor {
  if (!value) return { category, positions: {} };
  try {
    if (value.length > 4096) throw new Error();
    const parsed = record(JSON.parse(Buffer.from(value, "base64url").toString("utf8")));
    if (parsed.category !== category) throw new Error();
    const positions: Cursor["positions"] = {};
    for (const item of CATEGORIES) {
      const value = record(record(parsed.positions)[item.key]);
      if (!Object.keys(value).length) continue;
      if (!/^\d{4}-\d\d-\d\dT/.test(text(value.time)) || !Number.isFinite(Date.parse(text(value.time))) || !/^[a-f0-9]{64}$/.test(text(value.id))) throw new Error();
      positions[item.key] = { time: text(value.time), id: text(value.id) };
    }
    return { category, positions };
  } catch { throw new FeedbackError("Invalid feedback page cursor."); }
}

export async function listExperienceFeedback(params: { category?: string | null; cursor?: string | null; limit?: string | null } = {}): Promise<FeedbackInboxResponse> {
  const category = params.category || "all";
  if (category !== "all" && !CATEGORIES.some(item => item.key === category)) throw new FeedbackError("Unknown feedback category.");
  const limit = params.limit ? Number(params.limit) : 25;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new FeedbackError("Page size must be between 1 and 100.");
  const cursor = decodeCursor(params.cursor || null, category);
  const selected = CATEGORIES.filter(item => category === "all" || item.key === category);
  const [counts, pages] = await Promise.all([
    Promise.all(CATEGORIES.map(async item => ({ key: item.key, label: item.label, count: (await getAdminDb().collection(item.collection).count().get()).data().count }))),
    Promise.all(selected.map(async item => {
      let query = getAdminDb().collection(item.collection).orderBy("submittedAt", "desc").orderBy(FieldPath.documentId(), "desc");
      const position = cursor.positions[item.key];
      if (position) query = query.startAfter(position.time, position.id);
      const snapshot = await query.limit(limit + 1).get();
      return snapshot.docs.map(doc => {
        const data = doc.data();
        return {
          id: doc.id, category: item.key, categoryLabel: item.label,
          kind: data.kind, platform: data.platform, contextId: data.contextId || null, contextTitle: data.contextTitle || null,
          candidate: { uid: data.candidate?.uid || null, name: data.candidate?.name || null, email: data.candidate?.email || null },
          ratings: Object.entries(record(data.ratings)).filter(([, value]) => typeof value === "number" && value >= 1 && value <= 5)
            .map(([key, value]) => ({ key, label: RATING_LABELS[key] || key, value: value as number })),
          reason: data.reason || null, comment: data.comment || null, submittedAt: String(data.submittedAt || ""),
        } as FeedbackInboxItem;
      });
    })),
  ]);
  const merged = pages.flat().sort((a, b) => b.submittedAt.localeCompare(a.submittedAt) || b.id.localeCompare(a.id) || b.category.localeCompare(a.category));
  const items = merged.slice(0, limit);
  for (const item of items) cursor.positions[item.category] = { time: item.submittedAt, id: item.id };
  return {
    filters: [{ key: "all", label: "All Feedbacks", count: counts.reduce((total, item) => total + item.count, 0) }, ...counts],
    items, nextCursor: merged.length > limit ? Buffer.from(JSON.stringify(cursor)).toString("base64url") : null,
  };
}
