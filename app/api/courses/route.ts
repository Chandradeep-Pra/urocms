import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { requireAppUser } from "@/lib/server/appSession";
import {
  createCourse,
  listAppCoursesForUser,
  listCourses,
  parseCreateCourseInput,
} from "@/lib/server/courseService";

export async function GET(req: NextRequest) {
  const { session, response } = await requireAdminSession(req);

  if (!session && req.headers.get("authorization")?.startsWith("Bearer ")) {
    const appAuth = await requireAppUser(req);
    if ("response" in appAuth) {
      return appAuth.response;
    }

    try {
      const courses = await listAppCoursesForUser(appAuth.user);
      return NextResponse.json({
        tier: appAuth.user.tier,
        activeCourseIds: appAuth.user.activeCourseIds,
        courses,
      });
    } catch (error) {
      console.error("App courses fetch error:", error);
      return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
    }
  }

  if (response) return response;

  try {
    const courses = await listCourses();
    return NextResponse.json({ courses });
  } catch (error) {
    console.error("Courses fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch courses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const input = parseCreateCourseInput(await req.json());

    if (!input.title) {
      return NextResponse.json({ error: "Course title is required" }, { status: 400 });
    }

    const course = await createCourse(input);
    return NextResponse.json({ success: true, course });
  } catch (error) {
    console.error("Course create error:", error);
    return NextResponse.json({ error: "Failed to create course" }, { status: 500 });
  }
}
