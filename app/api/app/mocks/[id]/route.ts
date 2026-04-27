import { NextRequest, NextResponse } from "next/server";
import { FREE_WEEKLY_MOCK_PREVIEW_LIMIT, getMockAccess } from "@/lib/appAccess";
import { adminDb } from "@/lib/firebaseAdmin";
import { grantWeeklyMockPreview, getWeeklyMockPreviewUsage } from "@/lib/server/appUsage";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  const mockAccess = getMockAccess(auth.user.tier);

  if (!mockAccess.allowed) {
    return tierLockedResponse({
      feature: "mocks",
      tier: auth.user.tier,
      requiredTier: mockAccess.requiredTier ?? "free",
      reason: mockAccess.reason ?? "Mocks are locked.",
    });
  }

  try {
    const { id } = await context.params;
    const mockDoc = await adminDb.collection("mocks").doc(id).get();

    if (!mockDoc.exists) {
      return NextResponse.json({ error: "Mock not found" }, { status: 404 });
    }

    const mockData = mockDoc.data();
    const quizDoc = await adminDb.collection("quizzes").doc(mockData?.quizId).get();

    if (!quizDoc.exists) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const quizData = quizDoc.data();
    let questions: any[] = [];

    if (quizData?.questionIds?.length) {
      const snapshots = await Promise.all(
        quizData.questionIds.map((qid: string) => adminDb.collection("questions").doc(qid).get())
      );

      questions = snapshots
        .filter((doc) => doc.exists)
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
    } else if (quizData?.bankIds?.length) {
      const snapshot = await adminDb
        .collection("questions")
        .where("bankId", "in", quizData.bankIds)
        .where("isActive", "==", true)
        .get();

      questions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    let visibleQuestions = questions;
    let accessPayload: Record<string, unknown> = {
      tier: auth.user.tier,
      allowed: true,
      mode: mockAccess.mode,
      weeklyQuestionLimit: mockAccess.weeklyQuestionLimit,
      totalQuestionCount: questions.length,
      returnedQuestionCount: questions.length,
    };

    if (auth.user.tier === "free") {
      const usageBefore = await getWeeklyMockPreviewUsage(
        auth.user.uid,
        FREE_WEEKLY_MOCK_PREVIEW_LIMIT
      );

      const grant = await grantWeeklyMockPreview({
        uid: auth.user.uid,
        contentId: id,
        weeklyLimit: FREE_WEEKLY_MOCK_PREVIEW_LIMIT,
        availableQuestionCount: questions.length,
      });

      if (grant.grantedQuestions <= 0) {
        return tierLockedResponse({
          feature: "mocks",
          tier: auth.user.tier,
          requiredTier: "paid",
          reason: "Your free weekly mock preview is exhausted. Upgrade to paid to continue.",
        });
      }

      visibleQuestions = questions.slice(0, grant.grantedQuestions);
      accessPayload = {
        tier: auth.user.tier,
        allowed: true,
        mode: "preview",
        weeklyQuestionLimit: FREE_WEEKLY_MOCK_PREVIEW_LIMIT,
        totalQuestionCount: questions.length,
        returnedQuestionCount: visibleQuestions.length,
        weeklyConsumedQuestions: grant.consumedQuestions,
        weeklyRemainingQuestions: grant.remainingQuestions,
        reusedExistingGrant: grant.reusedExistingGrant,
        previouslyGrantedQuestions: usageBefore.usage.previewByContent?.[id] ?? 0,
      };
    }

    return NextResponse.json({
      mock: {
        id: mockDoc.id,
        ...mockData,
        startTime: mockData?.startTime?.toDate?.()?.toISOString?.() ?? mockData?.startTime ?? null,
        endTime: mockData?.endTime?.toDate?.()?.toISOString?.() ?? mockData?.endTime ?? null,
        attemptsCount: Array.isArray(mockData?.attempts)
          ? mockData.attempts.length
          : mockData?.attemptsCount ?? 0,
        quiz: {
          id: quizDoc.id,
          ...quizData,
        },
        questions: visibleQuestions,
      },
      access: accessPayload,
    });
  } catch (error) {
    console.error("App mock fetch error:", error);
    return NextResponse.json({ error: "Failed to load mock" }, { status: 500 });
  }
}
