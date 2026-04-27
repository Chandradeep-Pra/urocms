import { NextRequest, NextResponse } from "next/server";
import { FREE_CHAPTER_PREVIEW_LIMIT, getTierModules } from "@/lib/appAccess";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  return NextResponse.json({
    valid: true,
    tier: auth.user.tier,
    profile: {
      uid: auth.user.uid,
      email: auth.user.email,
      name: auth.user.name,
      googleAccessEmail: auth.user.googleAccessEmail,
    },
    policy: {
      freeChapterPreviewLimit: FREE_CHAPTER_PREVIEW_LIMIT,
      modules: getTierModules(auth.user.tier),
    },
  });
}
