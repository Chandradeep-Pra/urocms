import { NextRequest, NextResponse } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { listAppCoursesForUser } from "@/lib/server/courseService";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const courses = await listAppCoursesForUser(auth.user);

    return NextResponse.json({
      tier: auth.user.tier,
      activeCourseIds: auth.user.activeCourseIds,
      courses,
    });
  } catch (error) {
    console.error("App courses fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}
