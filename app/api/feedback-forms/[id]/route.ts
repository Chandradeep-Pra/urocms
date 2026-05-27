import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  deleteFeedbackForm,
  getFeedbackFormById,
  listFeedbackResponses,
  updateFeedbackForm,
} from "@/lib/server/feedbackFormService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    const [form, responses] = await Promise.all([
      getFeedbackFormById(id),
      listFeedbackResponses(id),
    ]);

    return NextResponse.json({ form, responses });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch feedback form";
    return NextResponse.json(
      { error: message },
      { status: message === "Feedback form not found" ? 404 : 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    const form = await updateFeedbackForm(id, await req.json());
    return NextResponse.json({ success: true, form });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update feedback form";
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
    return NextResponse.json(await deleteFeedbackForm(id));
  } catch (error) {
    console.error("Feedback form delete error:", error);
    return NextResponse.json(
      { error: "Failed to delete feedback form" },
      { status: 500 }
    );
  }
}
