import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import {
  averageWithNext,
  getQuizAttemptsCollection,
  toPercent,
  toPositiveNumber,
  updateUserStats,
} from "@/lib/server/candidateProgress";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const quizDoc = await adminDb.collection("quizzes").doc(id).get();

    if (!quizDoc.exists) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const quizData = quizDoc.data() ?? {};
    const quizType = String(quizData.type ?? "chapter");
    const accessContext = await buildAppContentAccessContext(auth.user);
    const access = accessContext.getQuizAccess({
      id,
      bankIds: Array.isArray(quizData.bankIds) ? quizData.bankIds : [],
      type: quizType,
    });

    if (!access.allowed) {
      return tierLockedResponse({
        feature: quizType === "chapter" ? "chapter-quiz" : quizType,
        tier: auth.user.tier,
        requiredTier: "paid",
        reason: access.reason ?? "Locked",
      });
    }

    const score = toPositiveNumber(body?.score);
    const correctCount = toPositiveNumber(body?.correctCount);
    const totalQuestions = toPositiveNumber(body?.totalQuestions);
    const timeTakenSeconds = toPositiveNumber(body?.timeTakenSeconds);
    const percent =
      totalQuestions > 0 ? toPercent(correctCount || score, totalQuestions) : null;
    const submittedAt = new Date().toISOString();

    await Promise.all([
      getQuizAttemptsCollection(auth.user.uid).doc().set({
        quizId: id,
        quizTitle: String(quizData.title || "").trim() || null,
        quizDescription: String(quizData.description || "").trim() || null,
        type: quizType,
        score,
        correctCount: correctCount || null,
        totalQuestions: totalQuestions || null,
        percent,
        timeTakenSeconds: timeTakenSeconds || null,
        submittedAt,
      }),
      updateUserStats(auth.user.uid, (current) => ({
        quizzesAttempted: current.quizzesAttempted + 1,
        averageQuizScore: averageWithNext(
          current.averageQuizScore,
          current.quizzesAttempted,
          score
        ),
        lastActivityAt: submittedAt,
      })),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Quiz attempt submit error:", error);
    return NextResponse.json({ error: "Failed to submit quiz attempt" }, { status: 500 });
  }
}
