import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import { getMockAttemptsCollection } from "@/lib/server/candidateProgress";
import { requireAppUser } from "@/lib/server/appSession";
import { privateJsonResponse } from "@/lib/server/apiMetrics";

export async function GET(req: NextRequest) {
  const startedAt = performance.now();
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const accessContext = await buildAppContentAccessContext(auth.user);
    const [snapshot, attemptsSnapshot] = await Promise.all([
      getAdminDb().collection("mocks").orderBy("createdAt", "desc").get(),
      getMockAttemptsCollection(auth.user.uid).orderBy("submittedAt", "desc").get(),
    ]);
    const attemptByMockId = new Map<string, Record<string, unknown>>();

    attemptsSnapshot.docs.forEach((doc) => {
      const data = doc.data() ?? {};
      const mockId = String(data.mockId || "").trim();
      if (mockId && !attemptByMockId.has(mockId)) {
        attemptByMockId.set(mockId, { id: doc.id, ...data });
      }
    });

    // Batch-fetch linked quiz docs to derive questionCount + description
    const uniqueQuizIds = [
      ...new Set(
        snapshot.docs
          .map((doc) => String(doc.data().quizId || "").trim())
          .filter(Boolean),
      ),
    ];
    const quizDataByQuizId = new Map<string, Record<string, unknown>>();
    if (uniqueQuizIds.length > 0) {
      const quizSnapshots = await Promise.all(
        uniqueQuizIds.map((quizId) =>
          getAdminDb().collection("quizzes").doc(quizId).get(),
        ),
      );
      quizSnapshots.forEach((snap) => {
        if (snap.exists) quizDataByQuizId.set(snap.id, snap.data() ?? {});
      });
    }

    const mocks = snapshot.docs.map((doc) => {
      const data = doc.data();
      const quizId = String(data.quizId || "").trim();
      const quizData = quizDataByQuizId.get(quizId);

      const legacyAttempt = Array.isArray(data.attempts)
        ? data.attempts.find(
            (attempt: any) =>
              String(attempt?.candidate?.email || "").trim().toLowerCase() ===
              String(auth.user.email || "").trim().toLowerCase()
          )
        : null;
      const userAttempt =
        attemptByMockId.get(doc.id) ??
        (legacyAttempt
          ? {
              score: Number(legacyAttempt.marks ?? 0),
              marks: Number(legacyAttempt.marks ?? 0),
              submittedAt: legacyAttempt.createdAt ?? null,
            }
          : null);
      const access = accessContext.getMockAccess({
        id: doc.id,
        type: String(data.type || "mock"),
        accessType: String(data.accessType || "restricted"),
      });

      // Derive question count from quiz questionIds array
      const questionCount =
        quizData && Array.isArray(quizData.questionIds)
          ? quizData.questionIds.length
          : typeof data.questionCount === "number"
            ? data.questionCount
            : typeof data.totalQuestions === "number"
              ? data.totalQuestions
              : undefined;

      // Derive description from quiz doc or mock doc
      const description =
        typeof quizData?.description === "string" && quizData.description.trim()
          ? quizData.description.trim()
          : typeof data.description === "string" && data.description.trim()
            ? data.description.trim()
            : undefined;

      return {
        id: doc.id,
        ...data,
        accessType: String(data.accessType || "restricted"),
        attemptsCount: Array.isArray(data.attempts)
          ? data.attempts.length
          : data.attemptsCount ?? 0,
        hasAttempted: Boolean(userAttempt),
        userAttempt,
        access: {
          tier: auth.user.tier,
          allowed: access.allowed,
          mode: access.mode,
          previewLimit: access.previewLimit ?? null,
          requiredTier: null,
          reason: access.reason ?? null,
          courseIds: access.courseIds,
        },
        ...(questionCount !== undefined ? { questionCount } : {}),
        ...(description !== undefined ? { description } : {}),
      };
    });

    return privateJsonResponse(
      { tier: auth.user.tier, mocks },
      {
        route: "/api/app/mocks",
        method: "GET",
        startedAt,
        userId: auth.user.uid,
        itemCount: mocks.length,
      }
    );
  } catch (error) {
    console.error("App mocks fetch error:", error);
    return privateJsonResponse(
      { error: "Failed to fetch mocks" },
      {
        status: 500,
        route: "/api/app/mocks",
        method: "GET",
        startedAt,
        userId: auth.user.uid,
      }
    );
  }
}
