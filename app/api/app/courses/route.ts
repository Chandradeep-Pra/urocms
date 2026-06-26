import { NextRequest } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { listAppCoursesForUser } from "@/lib/server/courseService";
import { privateJsonResponse } from "@/lib/server/apiMetrics";

export async function GET(req: NextRequest) {
  const startedAt = performance.now();
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const courses = await listAppCoursesForUser(auth.user);

    return privateJsonResponse(
      {
        tier: auth.user.tier,
        activeCourseIds: auth.user.activeCourseIds,
        courses,
      },
      {
        route: "/api/app/courses",
        method: "GET",
        startedAt,
        userId: auth.user.uid,
        itemCount: courses.length,
      }
    );
  } catch (error) {
    console.error("App courses fetch error:", error);
    return privateJsonResponse(
      { error: "Failed to fetch courses" },
      {
        status: 500,
        route: "/api/app/courses",
        method: "GET",
        startedAt,
        userId: auth.user.uid,
      }
    );
  }
}
