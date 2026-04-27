import { NextRequest, NextResponse } from "next/server";
import { canAccessViva } from "@/lib/appAccess";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
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
    const snapshot = await adminDb
      .collection("vivaCases")
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    const cases = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ tier: auth.user.tier, cases });
  } catch (error) {
    console.error("App viva cases fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}
