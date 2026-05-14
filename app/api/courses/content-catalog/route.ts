import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { loadCourseContentCatalog } from "@/lib/server/courseService";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const catalog = await loadCourseContentCatalog();
    return NextResponse.json({ catalog });
  } catch (error) {
    console.error("Course content catalog fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch course content catalog" }, { status: 500 });
  }
}
