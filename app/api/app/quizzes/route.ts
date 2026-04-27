import { NextRequest, NextResponse } from "next/server";
import { getQuizAccess } from "@/lib/appAccess";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
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
      const access = getQuizAccess(auth.user.tier, quizType);

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
          allowed: access.allowed,
          mode: access.mode,
          previewLimit: access.previewLimit,
          requiredTier: access.requiredTier ?? null,
          reason: access.reason ?? null,
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
