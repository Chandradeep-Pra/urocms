import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  getBookmarksCollection,
  getMockAttemptsCollection,
  getQuizAttemptsCollection,
  getUserStatsRef,
  getVideoProgressCollection,
  getVivaAttemptsCollection,
} from "@/lib/server/candidateProgress";
import { getAppDevicesCollection } from "@/lib/server/deviceTokenService";

type AppTier = "guest" | "free" | "paid";
type AppPlanStatus = "active" | "expired" | "none";

type UserDocShape = {
  id: string;
  data: Record<string, unknown>;
};

function normalizeString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeEmail(value: unknown) {
  return normalizeString(value).toLowerCase();
}

function normalizeTier(value: unknown): AppTier {
  return value === "paid" || value === "free" || value === "guest" ? value : "guest";
}

function normalizePlanStatus(value: unknown): AppPlanStatus {
  return value === "active" || value === "expired" || value === "none" ? value : "none";
}

function tierRank(value: unknown) {
  const tier = normalizeTier(value);
  if (tier === "paid") return 3;
  if (tier === "free") return 2;
  return 1;
}

function planRank(value: unknown) {
  const status = normalizePlanStatus(value);
  if (status === "active") return 3;
  if (status === "expired") return 2;
  return 1;
}

function toIso(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? new Date(parsed).toISOString() : value;
  }

  if (value instanceof Date) return value.toISOString();

  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate().toISOString();
  }

  return null;
}

function createdAtRank(value: unknown) {
  const iso = toIso(value);
  if (!iso) return Number.MAX_SAFE_INTEGER;
  const parsed = Date.parse(iso);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    const normalized = normalizeString(value);
    if (normalized) return normalized;
  }
  return null;
}

function uniqueIds(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => normalizeString(item)).filter(Boolean)));
}

function chooseCanonicalUser(docs: UserDocShape[], authUid?: string) {
  const visibleDocs = docs.filter((doc) => doc.data.isShadowDuplicate !== true);
  const candidates = visibleDocs.length > 0 ? visibleDocs : docs;

  return [...candidates].sort((left, right) => {
    const tierDelta = tierRank(right.data.tier) - tierRank(left.data.tier);
    if (tierDelta !== 0) return tierDelta;

    const planDelta = planRank(right.data.activePlanStatus) - planRank(left.data.activePlanStatus);
    if (planDelta !== 0) return planDelta;

    const leftCreated = createdAtRank(left.data.createdAt);
    const rightCreated = createdAtRank(right.data.createdAt);
    if (leftCreated !== rightCreated) return leftCreated - rightCreated;

    if (authUid) {
      if (left.id === authUid && right.id !== authUid) return -1;
      if (right.id === authUid && left.id !== authUid) return 1;
    }

    return left.id.localeCompare(right.id);
  })[0];
}

async function copySubcollectionById(params: {
  from: FirebaseFirestore.CollectionReference;
  to: FirebaseFirestore.CollectionReference;
}) {
  const snapshot = await params.from.get();
  if (snapshot.empty) return;

  const batch = getAdminDb().batch();
  snapshot.docs.forEach((doc) => {
    batch.set(params.to.doc(doc.id), doc.data(), { merge: true });
  });
  await batch.commit();
}

async function mergeUserScopedData(fromUid: string, toUid: string) {
  if (!fromUid || !toUid || fromUid === toUid) return;

  await Promise.all([
    copySubcollectionById({
      from: getVideoProgressCollection(fromUid),
      to: getVideoProgressCollection(toUid),
    }),
    copySubcollectionById({
      from: getMockAttemptsCollection(fromUid),
      to: getMockAttemptsCollection(toUid),
    }),
    copySubcollectionById({
      from: getQuizAttemptsCollection(fromUid),
      to: getQuizAttemptsCollection(toUid),
    }),
    copySubcollectionById({
      from: getVivaAttemptsCollection(fromUid),
      to: getVivaAttemptsCollection(toUid),
    }),
    copySubcollectionById({
      from: getBookmarksCollection(fromUid),
      to: getBookmarksCollection(toUid),
    }),
  ]);

  const [fromStatsDoc, toStatsDoc, deviceSnapshot, courseSnapshot] = await Promise.all([
    getUserStatsRef(fromUid).get(),
    getUserStatsRef(toUid).get(),
    getAppDevicesCollection().where("uid", "==", fromUid).get(),
    getAdminDb().collection("courses").get(),
  ]);

  if (fromStatsDoc.exists) {
    const fromStats = (fromStatsDoc.data() ?? {}) as Record<string, unknown>;
    const toStats = (toStatsDoc.data() ?? {}) as Record<string, unknown>;

    await getUserStatsRef(toUid).set(
      {
        videosStarted: Math.max(
          Number(toStats.videosStarted || 0),
          Number(fromStats.videosStarted || 0)
        ),
        videosCompleted: Math.max(
          Number(toStats.videosCompleted || 0),
          Number(fromStats.videosCompleted || 0)
        ),
        totalWatchMinutes: Math.max(
          Number(toStats.totalWatchMinutes || 0),
          Number(fromStats.totalWatchMinutes || 0)
        ),
        quizzesAttempted: Math.max(
          Number(toStats.quizzesAttempted || 0),
          Number(fromStats.quizzesAttempted || 0)
        ),
        mocksAttempted: Math.max(
          Number(toStats.mocksAttempted || 0),
          Number(fromStats.mocksAttempted || 0)
        ),
        grandMocksAttempted: Math.max(
          Number(toStats.grandMocksAttempted || 0),
          Number(fromStats.grandMocksAttempted || 0)
        ),
        vivaAttempts: Math.max(
          Number(toStats.vivaAttempts || 0),
          Number(fromStats.vivaAttempts || 0)
        ),
        bookmarksCount: Math.max(
          Number(toStats.bookmarksCount || 0),
          Number(fromStats.bookmarksCount || 0)
        ),
        averageQuizScore: Math.max(
          Number(toStats.averageQuizScore || 0),
          Number(fromStats.averageQuizScore || 0)
        ),
        averageMockScore: Math.max(
          Number(toStats.averageMockScore || 0),
          Number(fromStats.averageMockScore || 0)
        ),
        bestMockScore: Math.max(
          Number(toStats.bestMockScore || 0),
          Number(fromStats.bestMockScore || 0)
        ),
        lastActivityAt:
          [toIso(toStats.lastActivityAt), toIso(fromStats.lastActivityAt)]
            .filter(Boolean)
            .sort()
            .at(-1) ?? null,
        streakDays: Math.max(Number(toStats.streakDays || 0), Number(fromStats.streakDays || 0)),
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  }

  if (!deviceSnapshot.empty) {
    const batch = getAdminDb().batch();
    deviceSnapshot.docs.forEach((doc) => {
      batch.set(
        doc.ref,
        {
          uid: toUid,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
    });
    await batch.commit();
  }

  if (!courseSnapshot.empty) {
    const batch = getAdminDb().batch();

    courseSnapshot.docs.forEach((courseDoc) => {
      const data = courseDoc.data() ?? {};
      const memberUserIds = uniqueIds(data.memberUserIds).map((userId) =>
        userId === fromUid ? toUid : userId
      );
      const dedupedMemberUserIds = Array.from(new Set(memberUserIds));
      const memberUsers = Array.isArray(data.memberUsers)
        ? data.memberUsers.reduce((acc: any[], member: any) => {
            if (!member || typeof member !== "object") return acc;
            const nextId = normalizeString(member.id) === fromUid ? toUid : normalizeString(member.id);
            if (!nextId || acc.some((item) => item.id === nextId)) return acc;
            acc.push({ ...member, id: nextId });
            return acc;
          }, [])
        : [];
      const memberAccessGrants = Array.isArray(data.memberAccessGrants)
        ? data.memberAccessGrants.reduce((acc: any[], grant: any) => {
            if (!grant || typeof grant !== "object") return acc;
            const nextUserId =
              normalizeString(grant.userId) === fromUid ? toUid : normalizeString(grant.userId);
            if (!nextUserId) return acc;
            if (acc.some((item) => item.userId === nextUserId)) return acc;
            acc.push({ ...grant, userId: nextUserId });
            return acc;
          }, [])
        : [];

      if (
        JSON.stringify(dedupedMemberUserIds) !== JSON.stringify(data.memberUserIds ?? []) ||
        JSON.stringify(memberUsers) !== JSON.stringify(data.memberUsers ?? []) ||
        JSON.stringify(memberAccessGrants) !== JSON.stringify(data.memberAccessGrants ?? [])
      ) {
        batch.set(
          courseDoc.ref,
          {
            memberUserIds: dedupedMemberUserIds,
            memberUsers,
            memberAccessGrants,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }
    });

    await batch.commit();
  }
}

export async function resolveCanonicalUserRecord(params: {
  authUid: string;
  email: string | null;
  signInProvider?: string | null;
  firebaseName?: string | null;
  source?: string | null;
}) {
  const normalizedEmail = normalizeEmail(params.email);
  const currentRef = getAdminDb().collection("users").doc(params.authUid);
  const currentSnap = await currentRef.get();
  const currentData = currentSnap.data() ?? {};

  if (!normalizedEmail || params.signInProvider === "anonymous") {
    const canonicalUserId = normalizeString(currentData.canonicalUserId);
    if (canonicalUserId && canonicalUserId !== params.authUid) {
      const canonicalRef = getAdminDb().collection("users").doc(canonicalUserId);
      const canonicalSnap = await canonicalRef.get();
      if (canonicalSnap.exists) {
        return {
          uid: canonicalUserId,
          userDocRef: canonicalRef,
          userData: canonicalSnap.data() ?? {},
          mergedUserCount: 1,
          canonicalUserId,
        };
      }
    }

    return {
      uid: params.authUid,
      userDocRef: currentRef,
      userData: currentData,
      mergedUserCount: 0,
      canonicalUserId: params.authUid,
    };
  }

  const sameEmailSnapshot = await getAdminDb()
    .collection("users")
    .where("email", "==", normalizedEmail)
    .get();

  const docs = Array.from(
    new Map(
      [
        { id: params.authUid, data: currentData },
        ...sameEmailSnapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() ?? {} })),
      ].map((item) => [item.id, item])
    ).values()
  );

  const canonical = chooseCanonicalUser(docs, params.authUid);
  const duplicates = docs.filter((doc) => doc.id !== canonical.id);
  const canonicalRef = getAdminDb().collection("users").doc(canonical.id);

  const mergedPayload = {
    email: normalizedEmail,
    googleAccessEmail:
      firstNonEmptyString(
        canonical.data.googleAccessEmail,
        currentData.googleAccessEmail,
        normalizedEmail
      ) ?? normalizedEmail,
    name: firstNonEmptyString(canonical.data.name, params.firebaseName, currentData.name),
    profileImageUrl: firstNonEmptyString(
      canonical.data.profileImageUrl,
      currentData.profileImageUrl,
      ...duplicates.map((doc) => doc.data.profileImageUrl)
    ),
    phone: firstNonEmptyString(canonical.data.phone, currentData.phone),
    country: firstNonEmptyString(canonical.data.country, currentData.country),
    medicalInstitution: firstNonEmptyString(
      canonical.data.medicalInstitution,
      currentData.medicalInstitution
    ),
    source:
      firstNonEmptyString(params.source, canonical.data.source, currentData.source) ??
      params.signInProvider ??
      "mobile-app",
    tier: normalizeTier(
      [canonical.data.tier, currentData.tier, ...duplicates.map((doc) => doc.data.tier)].sort(
        (left, right) => tierRank(right) - tierRank(left)
      )[0]
    ),
    activeCourseIds: Array.from(
      new Set(
        [
          ...uniqueIds(canonical.data.activeCourseIds),
          ...uniqueIds(currentData.activeCourseIds),
          ...duplicates.flatMap((doc) => uniqueIds(doc.data.activeCourseIds)),
        ].filter(Boolean)
      )
    ),
    activePlanId:
      firstNonEmptyString(
        canonical.data.activePlanId,
        currentData.activePlanId,
        ...duplicates.map((doc) => doc.data.activePlanId)
      ) ?? null,
    activePlanStatus: [canonical.data.activePlanStatus, currentData.activePlanStatus, ...duplicates.map((doc) => doc.data.activePlanStatus)]
      .map(normalizePlanStatus)
      .sort((left, right) => planRank(right) - planRank(left))[0],
    planActivatedAt:
      firstNonEmptyString(
        canonical.data.planActivatedAt,
        currentData.planActivatedAt,
        ...duplicates.map((doc) => doc.data.planActivatedAt)
      ) ?? null,
    planExpiresAt:
      firstNonEmptyString(
        canonical.data.planExpiresAt,
        currentData.planExpiresAt,
        ...duplicates.map((doc) => doc.data.planExpiresAt)
      ) ?? null,
    vivaMinutesUsed: Math.max(
      Number(canonical.data.vivaMinutesUsed || 0),
      Number(currentData.vivaMinutesUsed || 0),
      ...duplicates.map((doc) => Number(doc.data.vivaMinutesUsed || 0))
    ),
    createdAt:
      firstNonEmptyString(
        canonical.data.createdAt,
        currentData.createdAt,
        ...duplicates.map((doc) => doc.data.createdAt)
      ) ?? new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    upgradedAt:
      firstNonEmptyString(
        canonical.data.upgradedAt,
        currentData.upgradedAt,
        ...duplicates.map((doc) => doc.data.upgradedAt)
      ) ?? null,
    canonicalUserId: canonical.id,
    isShadowDuplicate: false,
  };

  await canonicalRef.set(mergedPayload, { merge: true });

  for (const duplicate of duplicates) {
    await mergeUserScopedData(duplicate.id, canonical.id);
    await getAdminDb()
      .collection("users")
      .doc(duplicate.id)
      .set(
        {
          email: normalizeEmail(duplicate.data.email) || normalizedEmail,
          canonicalUserId: canonical.id,
          isShadowDuplicate: duplicate.id !== canonical.id,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );
  }

  const finalSnap = await canonicalRef.get();

  return {
    uid: canonical.id,
    userDocRef: canonicalRef,
    userData: finalSnap.data() ?? mergedPayload,
    mergedUserCount: duplicates.length,
    canonicalUserId: canonical.id,
  };
}

export function isVisibleUserDoc(data: Record<string, unknown>) {
  return data.isShadowDuplicate !== true;
}
