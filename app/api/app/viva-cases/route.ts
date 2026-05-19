import { NextRequest, NextResponse } from "next/server";
import { canAccessViva } from "@/lib/appAccess";
import { listVivaCases, listVivaCasesForCourseIds } from "@/lib/server/vivaService";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    if (canAccessViva(auth.user.tier)) {
      return NextResponse.json({
        tier: auth.user.tier,
        cases: await listVivaCases(),
      });
    }

    const courseGrantedCases = await listVivaCasesForCourseIds(auth.user.activeCourseIds);

    if (courseGrantedCases.length === 0) {
      return tierLockedResponse({
        feature: "ai-viva",
        tier: auth.user.tier,
        requiredTier: "paid",
        reason: "AI viva is available only for paid users unless a course grants access.",
      });
    }

    return NextResponse.json({
      tier: auth.user.tier,
      cases: courseGrantedCases,
    });
  } catch (error) {
    console.error("App viva cases fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}
