import { NextRequest } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";
import { formatQuestionsForApp, getQuestionsForQuiz } from "@/lib/server/quizContent";
import { privateJsonResponse } from "@/lib/server/apiMetrics";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = performance.now();
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const accessContext = await buildAppContentAccessContext(auth.user);
    const { id } = await context.params;
    const doc = await adminDb.collection("quizzes").doc(id).get();

    if (!doc.exists) {
      return privateJsonResponse(
        { error: "Quiz not found" },
        {
          status: 404,
          route: "/api/app/quizzes/[id]",
          method: "GET",
          startedAt,
          userId: auth.user.uid,
        }
      );
    }

    const quizData = doc.data() ?? {};
    const quizType = String(quizData.type ?? "chapter");
    const access = accessContext.getQuizAccess({
      id: doc.id,
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

    if ((quizType === "mock" || quizType === "grand-mock") && access.mode !== "full") {
      return tierLockedResponse({
        feature: quizType,
        tier: auth.user.tier,
        requiredTier: "paid",
        reason: "This mock is locked until it is included in your active plan.",
      });
    }

    const questions = await getQuestionsForQuiz(quizData);
    const totalQuestionCount = questions.length;
    const visibleQuestions =
      access.mode === "preview" && access.previewLimit
        ? questions.slice(0, access.previewLimit)
        : questions;

    return privateJsonResponse(
      {
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
      },
      {
        route: "/api/app/quizzes/[id]",
        method: "GET",
        startedAt,
        userId: auth.user.uid,
        itemCount: visibleQuestions.length,
      }
    );
  } catch (error) {
    console.error("App quiz fetch error:", error);
    return privateJsonResponse(
      { error: "Failed to load quiz" },
      {
        status: 500,
        route: "/api/app/quizzes/[id]",
        method: "GET",
        startedAt,
        userId: auth.user.uid,
      }
    );
  }
}
