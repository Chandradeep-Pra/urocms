import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  createTestimonial,
  listAllTestimonials,
  listPublicTestimonials,
} from "@/lib/server/testimonialService";

export async function GET(req: NextRequest) {
  const hasAuthHeader = Boolean(req.headers.get("authorization"));

  if (hasAuthHeader) {
    const admin = await requireAdminSession(req);
    if (!admin.response) {
      try {
        return NextResponse.json({
          testimonials: await listAllTestimonials(),
        });
      } catch (error) {
        console.error("Testimonials admin fetch error:", error);
        return NextResponse.json(
          { error: "Failed to fetch testimonials" },
          { status: 500 }
        );
      }
    }

    return admin.response;
  }

  try {
    return NextResponse.json({
      testimonials: await listPublicTestimonials(),
    });
  } catch (error) {
    console.error("Testimonials public fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch testimonials" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const testimonial = await createTestimonial(await req.json());
    return NextResponse.json({ success: true, testimonial });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create testimonial";
    return NextResponse.json(
      { error: message },
      { status: message.includes("required") ? 400 : 500 }
    );
  }
}
