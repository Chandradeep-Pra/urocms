import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { canAccessViva } from "@/lib/appAccess";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";

export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  if (!canAccessViva(auth.user.tier)) {
    return tierLockedResponse({
      feature: "ai-viva",
      tier: auth.user.tier,
      requiredTier: "paid",
      reason: "AI viva is available only for paid users.",
    });
  }

  try {
    const body = await req.json();
    const { caseId, report } = body;

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    const candidate = {
      uid: auth.user.uid,
      name: body?.candidate?.name || auth.user.name || "Paid User",
      email: auth.user.email || "",
    };

    if (!candidate.email) {
      return NextResponse.json({ error: "Authenticated email required" }, { status: 400 });
    }

    await adminDb.collection("vivaAttempts").add({
      caseId,
      candidate,
      report: report ?? null,
      createdAt: FieldValue.serverTimestamp(),
    });

    await adminDb.collection("vivaCases").doc(caseId).update({
      attemptsCount: FieldValue.increment(1),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("App viva attempt submit error:", error);
    return NextResponse.json({ error: "Failed to submit attempt" }, { status: 500 });
  }
}
