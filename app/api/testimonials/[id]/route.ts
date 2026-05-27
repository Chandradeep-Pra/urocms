import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  deleteTestimonial,
  updateTestimonial,
} from "@/lib/server/testimonialService";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    const testimonial = await updateTestimonial(id, await req.json());
    return NextResponse.json({ success: true, testimonial });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update testimonial";
    return NextResponse.json(
      { error: message },
      { status: message.includes("required") ? 400 : 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    return NextResponse.json(await deleteTestimonial(id));
  } catch (error) {
    console.error("Delete testimonial error:", error);
    return NextResponse.json(
      { error: "Failed to delete testimonial" },
      { status: 500 }
    );
  }
}
