import { getAdminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import {
  defaultUserStats,
  getMockAttemptsCollection,
  getQuizAttemptsCollection,
  getUserStatsRef,
  getVivaAttemptsCollection,
  type UserStatsRecord,
} from "@/lib/server/candidateProgress";
import type { AppUserSession } from "@/lib/server/appSession";

type AttemptRecord = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  score: number | null;
  correctCount: number | null;
  totalQuestions: number | null;
  percent: number | null;
  timeTakenSeconds: number | null;
  submittedAt: string | null;
};

type VivaAttemptRecord = {
  id: string;
  caseId: string | null;
  caseTitle: string;
  mode: string | null;
  score: number | null;
  durationSeconds: number | null;
  submittedAt: string | null;
  report: unknown;
};

export type AdminUserProfile = {
  user: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    medicalInstitution: string | null;
    tier: "guest" | "free" | "paid";
    source: string | null;
    createdAt: string | null;
    updatedAt: string | null;
    activeCourseIds: string[];
    activeCourses: Array<{ id: string; title: string }>;
    activePlanId: string | null;
    activePlanStatus: "active" | "expired" | "none";
    vivaMinutesUsed: number;
  };
  stats: UserStatsRecord;
  vivaCredit: {
    totalMinutes: number;
    usedMinutes: number;
    remainingMinutes: number;
    percentRemaining: number;
  };
  quizAttempts: AttemptRecord[];
  mockAttempts: AttemptRecord[];
  vivaAttempts: VivaAttemptRecord[];
};

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object" && value !== null && "toDate" in value) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }
  return null;
}

function toNumberOrNull(value: unknown) {
  const normalized = typeof value === "number" ? value : Number(value);
  return Number.isFinite(normalized) ? normalized : null;
}

function normalizeAttempt(
  id: string,
  data: Record<string, unknown>,
  titleKey: "quizTitle" | "mockTitle",
  fallbackType: string
): AttemptRecord {
  return {
    id,
    title: String(data[titleKey] || "").trim() || "Untitled attempt",
    description:
      String(
        data[titleKey === "quizTitle" ? "quizDescription" : "mockDescription"] || ""
      ).trim() || null,
    type: String(data.type || fallbackType).trim() || fallbackType,
    score: toNumberOrNull(data.score),
    correctCount: toNumberOrNull(data.correctCount),
    totalQuestions: toNumberOrNull(data.totalQuestions),
    percent: toNumberOrNull(data.percent),
    timeTakenSeconds: toNumberOrNull(data.timeTakenSeconds),
    submittedAt: toIsoString(data.submittedAt),
  };
}

function normalizeVivaAttempt(id: string, data: Record<string, unknown>): VivaAttemptRecord {
  return {
    id,
    caseId: String(data.caseId || "").trim() || null,
    caseTitle: String(data.caseTitle || "").trim() || "Untitled viva",
    mode: String(data.mode || "").trim() || null,
    score: toNumberOrNull(data.score),
    durationSeconds: toNumberOrNull(data.durationSeconds),
    submittedAt: toIsoString(data.submittedAt),
    report: data.report ?? null,
  };
}

export async function getAdminUserProfile(userId: string): Promise<AdminUserProfile | null> {
  const userRef = getAdminDb().collection("users").doc(userId);
  const userDoc = await userRef.get();

  if (!userDoc.exists) {
    return null;
  }

  const userData = userDoc.data() ?? {};
  const activeCourseIds = Array.isArray(userData.activeCourseIds)
    ? userData.activeCourseIds.map((value) => String(value).trim()).filter(Boolean)
    : [];

  const [courseDocs, statsDoc, quizAttemptsSnap, mockAttemptsSnap, vivaAttemptsSnap] =
    await Promise.all([
      activeCourseIds.length
        ? Promise.all(activeCourseIds.map((courseId) => getAdminDb().collection("courses").doc(courseId).get()))
        : Promise.resolve([]),
      getUserStatsRef(userId).get(),
      getQuizAttemptsCollection(userId).orderBy("submittedAt", "desc").limit(50).get(),
      getMockAttemptsCollection(userId).orderBy("submittedAt", "desc").limit(50).get(),
      getVivaAttemptsCollection(userId).orderBy("submittedAt", "desc").limit(50).get(),
    ]);

  const sessionLikeUser: AppUserSession = {
    authUid: userId,
    uid: userId,
    authTime: null,
    email: userData.email ?? null,
    name: userData.name ?? null,
    profileImageUrl:
      typeof userData.profileImageUrl === "string" && userData.profileImageUrl.trim()
        ? userData.profileImageUrl.trim()
        : null,
    phone:
      typeof userData.phone === "string" && userData.phone.trim() ? userData.phone.trim() : null,
    country:
      typeof userData.country === "string" && userData.country.trim() ? userData.country.trim() : null,
    medicalInstitution:
      typeof userData.medicalInstitution === "string" && userData.medicalInstitution.trim()
        ? userData.medicalInstitution.trim()
        : null,
    tier: userData.tier === "paid" || userData.tier === "free" || userData.tier === "guest"
      ? userData.tier
      : "guest",
    googleAccessEmail: userData.googleAccessEmail ?? userData.email ?? null,
    source: userData.source ?? null,
    activeCourseIds,
    activePlanId: userData.activePlanId ? String(userData.activePlanId) : null,
    activePlanStatus:
      userData.activePlanStatus === "active" ||
      userData.activePlanStatus === "expired" ||
      userData.activePlanStatus === "none"
        ? userData.activePlanStatus
        : "none",
    planActivatedAt: userData.planActivatedAt ?? null,
    planExpiresAt: userData.planExpiresAt ?? null,
    vivaMinutesUsed: Number.isFinite(Number(userData.vivaMinutesUsed))
      ? Math.max(0, Number(userData.vivaMinutesUsed))
      : 0,
  };

  const accessContext = await buildAppContentAccessContext(sessionLikeUser);
  const stats = statsDoc.exists
    ? {
        ...defaultUserStats(),
        ...(statsDoc.data() ?? {}),
      }
    : defaultUserStats();

  return {
    user: {
      id: userDoc.id,
      name: String(userData.name || "").trim() || "Unnamed user",
      email: String(userData.email || "").trim() || "No email",
      phone: sessionLikeUser.phone,
      medicalInstitution: sessionLikeUser.medicalInstitution,
      tier: sessionLikeUser.tier,
      source: userData.source ? String(userData.source) : null,
      createdAt: toIsoString(userData.createdAt),
      updatedAt: toIsoString(userData.updatedAt),
      activeCourseIds,
      activeCourses: courseDocs
        .filter((doc) => doc.exists)
        .map((doc) => ({
          id: doc.id,
          title: String(doc.data()?.title || doc.id),
        })),
      activePlanId: sessionLikeUser.activePlanId,
      activePlanStatus: sessionLikeUser.activePlanStatus,
      vivaMinutesUsed: sessionLikeUser.vivaMinutesUsed,
    },
    stats,
    vivaCredit: accessContext.vivaCredit,
    quizAttempts: quizAttemptsSnap.docs.map((doc) =>
      normalizeAttempt(doc.id, doc.data() as Record<string, unknown>, "quizTitle", "chapter")
    ),
    mockAttempts: mockAttemptsSnap.docs.map((doc) =>
      normalizeAttempt(doc.id, doc.data() as Record<string, unknown>, "mockTitle", "mock")
    ),
    vivaAttempts: vivaAttemptsSnap.docs.map((doc) =>
      normalizeVivaAttempt(doc.id, doc.data() as Record<string, unknown>)
    ),
  };
}
