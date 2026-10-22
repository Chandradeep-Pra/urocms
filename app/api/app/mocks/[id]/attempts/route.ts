import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import {
  averageWithNext,
  getMockAttemptsCollection,
  toPercent,
  toPositiveNumber,
  updateUserStats,
} from "@/lib/server/candidateProgress";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";
import { firstMockAttempts, normalizeMockAnswers } from "@/lib/server/mockAttempts";
import { createMockCompletion, withOriginalMockCompletion, recordedMockSeconds } from "@/lib/server/mockAttemptTracking";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const marks = body?.marks;
    const correctCount = toPositiveNumber(body?.correctCount);
    const totalQuestions = toPositiveNumber(body?.totalQuestions);
    const timeTakenSeconds = recordedMockSeconds(body?.timeTakenSeconds);

    if (marks === undefined || marks === null) {
      return NextResponse.json({ error: "Marks are required" }, { status: 400 });
    }

    const mockRef = getAdminDb().collection("mocks").doc(id);
    const mockDoc = await mockRef.get();

    if (!mockDoc.exists) {
      return NextResponse.json({ error: "Mock not found" }, { status: 404 });
    }

    const mockData = mockDoc.data();
    const isPublic = String(mockData?.accessType || "restricted") === "public";
    const normalizedMarks = typeof marks === "number" ? marks : Number(marks);
    const accessContext = await buildAppContentAccessContext(auth.user);
    const mockAccess = isPublic
      ? {
          allowed: true,
          mode: "full" as const,
          reason: null,
        }
      : accessContext.getMockAccess({
          id,
          type: String(mockData?.type || "mock"),
          accessType: String(mockData?.accessType || "restricted"),
        });

    if (!Number.isFinite(normalizedMarks)) {
      return NextResponse.json({ error: "Invalid marks" }, { status: 400 });
    }

    if (!mockAccess.allowed || mockAccess.mode === "locked") {
      return tierLockedResponse({
        feature: mockData?.type === "grand-mock" ? "grand-mock" : "mock",
        tier: auth.user.tier,
        requiredTier: "paid",
        reason:
          mockAccess.reason ||
          "This mock is locked until the matching course or section is unlocked.",
      });
    }

    let resolvedTotalQuestions = totalQuestions;
    if (!resolvedTotalQuestions && mockData?.quizId) {
      try {
        const quizDoc = await getAdminDb().collection("quizzes").doc(String(mockData.quizId)).get();
        if (quizDoc.exists) {
          const qData = quizDoc.data() ?? {};
          if (Array.isArray(qData.questionIds) && qData.questionIds.length > 0) {
            resolvedTotalQuestions = qData.questionIds.length;
          }
        }
      } catch {
        // ignore
      }
    }

    const clampedMarks = resolvedTotalQuestions > 0
      ? Math.max(0, Math.min(Math.round(normalizedMarks), resolvedTotalQuestions))
      : Math.max(0, Math.round(normalizedMarks));
    const clampedCorrect = correctCount ? Math.min(correctCount, resolvedTotalQuestions || correctCount) : clampedMarks;

    const attemptType =
      mockData?.type === "grand-mock" ? "grand-mock" : "mock";
    const mockTitle =
      String(mockData?.title || mockData?.quiz?.title || "").trim() || null;
    const mockDescription =
      String(mockData?.description || mockData?.quiz?.description || "").trim() || null;
    const percent =
      resolvedTotalQuestions > 0 ? toPercent(clampedCorrect, resolvedTotalQuestions) : null;
    const createdAt = new Date().toISOString();

    const userImage = auth.user.profileImageUrl || null;
    const completion = createMockCompletion(auth.user, {
      marks: clampedMarks, totalQuestions: resolvedTotalQuestions,
      timeTakenSeconds, answers: body?.answers, submissionId: body?.submissionId,
    }, createdAt);
    const completionRef = mockRef.collection("submissions").doc(completion.id);
    const nextAttempt = {
      attemptNumber: 1,
      candidate: {
        uid: auth.user.uid,
        name: auth.user.name || "Paid User",
        email: auth.user.email || "",
        image: userImage,
      },
      marks: clampedMarks,
      maxMarks: resolvedTotalQuestions > 0 ? resolvedTotalQuestions : undefined,
      createdAt,
      timeTakenSeconds,
      completionKey: completion.id,
    };

    const userAttemptRef = getMockAttemptsCollection(auth.user.uid).doc(id);
    const transactionResult = await getAdminDb().runTransaction(async (transaction) => {
      const [latestMockDoc, deterministicAttemptDoc, savedCompletion] = await Promise.all([
        transaction.get(mockRef),
        transaction.get(userAttemptRef),
        transaction.get(completionRef),
      ]);
      const latestMockData = latestMockDoc.data() ?? {};
      if (!latestMockDoc.exists) throw new Error("Mock not found");
      const latestAttempts = firstMockAttempts(
        Array.isArray(latestMockData.attempts) ? latestMockData.attempts : [],
        Array.isArray(latestMockData.history) ? latestMockData.history : [],
      );
      const latestEmailAttempt = latestAttempts.find(
        (attempt) =>
          String(attempt?.candidate?.uid || "").trim() === auth.user.uid ||
          Boolean(auth.user.email) && String(attempt?.candidate?.email || "").trim().toLowerCase() ===
          String(auth.user.email || "").trim().toLowerCase()
      );
      const original = deterministicAttemptDoc.exists ? deterministicAttemptDoc.data() : latestEmailAttempt;
      if (!savedCompletion.exists) transaction.set(completionRef,
        withOriginalMockCompletion(completion.id, completion.record, original));
      if (deterministicAttemptDoc.exists || latestEmailAttempt) {
        return { alreadyRecorded: true, attemptsCount: latestAttempts.length, attempt: latestEmailAttempt || deterministicAttemptDoc.data() };
      }
      const attempts = [...latestAttempts, nextAttempt];

      transaction.update(mockRef, {
        attempts,
        attemptsCount: attempts.length,
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(userAttemptRef, {
        mockId: id,
        mockTitle,
        mockDescription,
        quizId: mockData?.quizId ?? null,
        type: attemptType,
        score: clampedMarks,
        correctCount: clampedCorrect,
        totalQuestions: resolvedTotalQuestions || null,
        percent,
        timeTakenSeconds,
        completionKey: completion.id,
        submittedAt: createdAt,
        answers: normalizeMockAnswers(body?.answers),
      });

      return {
        alreadyRecorded: false,
        attemptsCount: attempts.length,
        attempt: nextAttempt,
      };
    });

    if (!transactionResult.alreadyRecorded) {
      await updateUserStats(auth.user.uid, (current) => {
        const attemptCountBase = current.mocksAttempted + current.grandMocksAttempted;
        return {
          mocksAttempted:
            current.mocksAttempted + (attemptType === "mock" ? 1 : 0),
          grandMocksAttempted:
            current.grandMocksAttempted + (attemptType === "grand-mock" ? 1 : 0),
          averageMockScore: averageWithNext(
            current.averageMockScore,
            attemptCountBase,
            clampedMarks
          ),
          bestMockScore: Math.max(current.bestMockScore, clampedMarks),
          lastActivityAt: createdAt,
        };
      });
    }

    return NextResponse.json({
      success: true,
      attemptsCount: transactionResult.attemptsCount,
      attempt: transactionResult.attempt,
      replacedExisting: false,
      alreadyRecorded: transactionResult.alreadyRecorded,
    });
  } catch (error) {
    console.error("App mock attempt submit error:", error);
    return NextResponse.json({ error: "Failed to submit mock attempt" }, { status: 500 });
  }
}
