import { NextRequest, NextResponse } from "next/server";
import { getQuizAccess } from "@/lib/appAccess";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";
import { formatQuestionsForApp, getQuestionsForQuiz } from "@/lib/server/quizContent";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const doc = await adminDb.collection("quizzes").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const quizData = doc.data() ?? {};
    const quizType = String(quizData.type ?? "chapter");
    const access = getQuizAccess(auth.user.tier, quizType);

    if (!access.allowed) {
      return tierLockedResponse({
        feature: quizType === "chapter" ? "chapter-quiz" : quizType,
        tier: auth.user.tier,
        requiredTier: access.requiredTier ?? "paid",
        reason: access.reason ?? "Locked",
      });
    }

    const questions = await getQuestionsForQuiz(quizData);
    const totalQuestionCount = questions.length;
    const visibleQuestions =
      access.mode === "preview" && access.previewLimit
        ? questions.slice(0, access.previewLimit)
        : questions;

    return NextResponse.json({
      quiz: {
        id: doc.id,
        ...quizData,
        questions: formatQuestionsForApp(visibleQuestions),
      },
      access: {
        tier: auth.user.tier,
        allowed: true,
        mode: access.mode,
        previewLimit: access.previewLimit,
        totalQuestionCount,
        returnedQuestionCount: visibleQuestions.length,
      },
    });
  } catch (error) {
    console.error("App quiz fetch error:", error);
    return NextResponse.json({ error: "Failed to load quiz" }, { status: 500 });
  }
}
