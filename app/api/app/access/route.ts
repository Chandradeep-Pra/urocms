import { NextRequest, NextResponse } from "next/server";
import {
  FREE_AI_VIVA_MINUTES,
  FREE_CHAPTER_PREVIEW_LIMIT,
  getTierModules,
} from "@/lib/appAccess";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import { resolveAppPlanAccess } from "@/lib/server/appPlanAccess";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;
  const [planAccess, accessContext] = await Promise.all([
    resolveAppPlanAccess(auth.user),
    buildAppContentAccessContext(auth.user),
  ]);

  return NextResponse.json({
    valid: true,
    tier: auth.user.tier,
    profile: {
      uid: auth.user.uid,
      email: auth.user.email,
      name: auth.user.name,
      profileImageUrl: auth.user.profileImageUrl,
      phone: auth.user.phone,
      country: auth.user.country,
      googleAccessEmail: auth.user.googleAccessEmail,
      activeCourseIds: auth.user.activeCourseIds,
      activePlanId: planAccess.activePlanId,
      activePlanStatus: planAccess.activePlanStatus,
      planActivatedAt: planAccess.planActivatedAt,
      planExpiresAt: planAccess.planExpiresAt,
    },
    policy: {
      freeChapterPreviewLimit: FREE_CHAPTER_PREVIEW_LIMIT,
      freeWeeklyMockPreviewLimit: 0,
      freeAiVivaMinutes: FREE_AI_VIVA_MINUTES,
      modules: getTierModules(auth.user.tier),
    },
    plan: planAccess.plan,
    entitlements: planAccess.entitlements,
    vivaCredit: accessContext.vivaCredit,
  });
}
