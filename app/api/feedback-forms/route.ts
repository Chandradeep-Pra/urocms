import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  createFeedbackForm,
  listFeedbackForms,
} from "@/lib/server/feedbackFormService";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    return NextResponse.json({
      forms: await listFeedbackForms(),
    });
  } catch (error) {
    console.error("Feedback forms fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch feedback forms" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const form = await createFeedbackForm(await req.json());
    return NextResponse.json({ success: true, form });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create feedback form";
    return NextResponse.json(
      { error: message },
      { status: message.includes("required") ? 400 : 500 }
    );
  }
}
