import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  deleteCourse,
  getCourseById,
  parseUpdateCourseInput,
  updateCourse,
} from "@/lib/server/courseService";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await params;
    const course = await getCourseById(id);

    if (!course) {
      return NextResponse.json({ error: "Course not found" }, { status: 404 });
    }

    return NextResponse.json({ course });
  } catch (error) {
    console.error("Course fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch course" }, { status: 500 });
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await params;
    const input = parseUpdateCourseInput(await req.json());

    if (!input.title) {
      return NextResponse.json({ error: "Course title is required" }, { status: 400 });
    }

    const result = await updateCourse(id, input);
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    if (error instanceof Error && error.message === "Course not found") {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    console.error("Course update error:", error);
    return NextResponse.json({ error: "Failed to update course" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await params;
    await deleteCourse(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Course delete error:", error);
    return NextResponse.json({ error: "Failed to delete course" }, { status: 500 });
  }
}
