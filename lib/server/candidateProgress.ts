import { getAdminDb } from "@/lib/firebaseAdmin";

export type UserStatsRecord = {
  videosStarted: number;
  videosCompleted: number;
  totalWatchMinutes: number;
  quizzesAttempted: number;
  mocksAttempted: number;
  grandMocksAttempted: number;
  vivaAttempts: number;
  bookmarksCount: number;
  averageQuizScore: number;
  averageMockScore: number;
  bestMockScore: number;
  lastActivityAt: string | null;
  streakDays: number;
  updatedAt: string;
};

export const defaultUserStats = (): UserStatsRecord => ({
  videosStarted: 0,
  videosCompleted: 0,
  totalWatchMinutes: 0,
  quizzesAttempted: 0,
  mocksAttempted: 0,
  grandMocksAttempted: 0,
  vivaAttempts: 0,
  bookmarksCount: 0,
  averageQuizScore: 0,
  averageMockScore: 0,
  bestMockScore: 0,
  lastActivityAt: null,
  streakDays: 0,
  updatedAt: new Date().toISOString(),
});

export function getVideoProgressCollection(uid: string) {
  return getAdminDb().collection("videoProgress").doc(uid).collection("items");
}

export function getMockAttemptsCollection(uid: string) {
  return getAdminDb().collection("mockAttempts").doc(uid).collection("items");
}

export function getQuizAttemptsCollection(uid: string) {
  return getAdminDb().collection("quizAttempts").doc(uid).collection("items");
}

export function getVivaAttemptsCollection(uid: string) {
  return getAdminDb().collection("vivaAttempts").doc(uid).collection("items");
}

export function getBookmarksCollection(uid: string) {
  return getAdminDb().collection("bookmarks").doc(uid).collection("items");
}

export function getUserStatsRef(uid: string) {
  return getAdminDb().collection("userStats").doc(uid);
}

export async function readUserStats(uid: string) {
  const doc = await getUserStatsRef(uid).get();
  if (!doc.exists) return defaultUserStats();

  return {
    ...defaultUserStats(),
    ...(doc.data() as Partial<UserStatsRecord>),
  };
}

export async function writeUserStats(uid: string, stats: Partial<UserStatsRecord>) {
  await getUserStatsRef(uid).set(
    {
      ...stats,
      updatedAt: new Date().toISOString(),
    },
    { merge: true }
  );
}

export async function updateUserStats(
  uid: string,
  updater: (current: UserStatsRecord) => Partial<UserStatsRecord>
) {
  const current = await readUserStats(uid);
  const next = updater(current);
  await writeUserStats(uid, next);
  return {
    ...current,
    ...next,
  };
}

export function averageWithNext(currentAverage: number, currentCount: number, nextValue: number) {
  const safeCount = Math.max(0, currentCount);
  return Number(
    (((currentAverage || 0) * safeCount + nextValue) / (safeCount + 1)).toFixed(2)
  );
}

export function toPositiveNumber(value: unknown, fallback = 0) {
  const normalized = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(normalized) || normalized < 0) {
    return fallback;
  }
  return normalized;
}

export function toPercent(score: number, total: number) {
  if (!Number.isFinite(score) || !Number.isFinite(total) || total <= 0) {
    return 0;
  }
  return Number(((score / total) * 100).toFixed(2));
}
