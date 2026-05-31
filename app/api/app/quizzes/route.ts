import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const accessContext = await buildAppContentAccessContext(auth.user);
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");

    let query = adminDb.collection("quizzes").where("isActive", "==", true);

    if (type) {
      query = query.where("type", "==", type);
    }

    query = query.orderBy("createdAt", "desc");

    const snapshot = await query.get();
    const quizzes = snapshot.docs.map((doc) => {
      const data = doc.data();
      const quizType = String(data.type ?? "chapter");
      const access = accessContext.getQuizAccess({
        id: doc.id,
        bankIds: Array.isArray(data.bankIds) ? data.bankIds : [],
        type: quizType,
      });
      const mockPreviewBlocked =
        (quizType === "mock" || quizType === "grand-mock") && access.mode !== "full";
      const effectiveAccess = mockPreviewBlocked
        ? {
            ...access,
            allowed: false,
            mode: "locked" as const,
            previewLimit: null,
            reason: "This mock is locked until it is included in your active plan.",
          }
        : access;

      return {
        id: doc.id,
        title: data.title ?? "",
        description: data.description ?? "",
        type: quizType,
        durationMinutes: data.durationMinutes ?? 60,
        bankIds: Array.isArray(data.bankIds) ? data.bankIds : [],
        questionIds: Array.isArray(data.questionIds) ? data.questionIds : [],
        access: {
          tier: auth.user.tier,
          allowed: effectiveAccess.allowed,
          mode: effectiveAccess.mode,
          previewLimit: effectiveAccess.previewLimit,
          requiredTier: effectiveAccess.mode === "locked" ? "paid" : null,
          reason: effectiveAccess.reason ?? null,
          courseIds: effectiveAccess.courseIds,
        },
      };
    });

    return NextResponse.json({
      tier: auth.user.tier,
      quizzes,
    });
  } catch (error) {
    console.error("App quizzes fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch quizzes" }, { status: 500 });
  }
}
