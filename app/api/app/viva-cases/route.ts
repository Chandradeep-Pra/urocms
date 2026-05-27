import { NextRequest, NextResponse } from "next/server";
import { canAccessViva } from "@/lib/appAccess";
import { listVivaCases, listVivaCasesForCourseIds } from "@/lib/server/vivaService";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const allCases = await listVivaCases();
    const courseGrantedCases = await listVivaCasesForCourseIds(auth.user.activeCourseIds);
    const grantedIds = new Set(courseGrantedCases.map((item) => item?.id).filter(Boolean));
    const paidUnlocked = canAccessViva(auth.user.tier);
    const cases = allCases.map((item: any) => {
      const isPublic = item?.accessType === "public";
      const courseGranted = grantedIds.has(item.id);
      const allowed = isPublic || paidUnlocked || courseGranted;

      return {
        ...item,
        accessType: isPublic ? "public" : "restricted",
        access: {
          tier: auth.user.tier,
          allowed,
          mode: allowed ? (isPublic ? "public" : "full") : "locked",
          requiredTier: isPublic ? null : "paid",
          reason: allowed
            ? null
            : "AI viva is available only for paid users unless a course grants access.",
          courseGranted,
          isPublic,
        },
      };
    });

    return NextResponse.json({
      tier: auth.user.tier,
      cases,
    });
  } catch (error) {
    console.error("App viva cases fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch cases" }, { status: 500 });
  }
}
