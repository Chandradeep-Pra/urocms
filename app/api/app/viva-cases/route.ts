import { NextRequest, NextResponse } from "next/server";
import { canAccessViva } from "@/lib/appAccess";
import { listVivaCasesForCourseIds } from "@/lib/server/vivaService";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const accessibleCases = await listVivaCasesForCourseIds(auth.user.activeCourseIds);
    const trialCases = accessibleCases.filter((item) => item?.accessType === "trial");
    const courseGrantedCases = accessibleCases.filter((item) => item?.accessType !== "trial");
    const hasCourseGrantedAccess = courseGrantedCases.length > 0;

    if (!canAccessViva(auth.user.tier) && !hasCourseGrantedAccess && trialCases.length === 0) {
      return tierLockedResponse({
        feature: "ai-viva",
        tier: auth.user.tier,
        requiredTier: "paid",
        reason: "AI viva is available only for paid users unless a trial case is published or a course grants access.",
      });
    }

    return NextResponse.json({
      tier: auth.user.tier,
      cases:
        canAccessViva(auth.user.tier) || hasCourseGrantedAccess
          ? accessibleCases
          : trialCases,
    });
  } catch (error) {
    console.error("App viva cases fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}
