import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { loadCourseMembersCatalog } from "@/lib/server/courseService";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const users = await loadCourseMembersCatalog();
    return NextResponse.json({ users });
  } catch (error) {
    console.error("Course members catalog fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
