import { NextRequest, NextResponse } from "next/server";
import {
  findFeedbackFormByToken,
  submitFeedbackResponse,
} from "@/lib/server/feedbackFormService";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const form = await findFeedbackFormByToken(token);

    if (!form) {
      return NextResponse.json({ error: "Feedback link not found" }, { status: 404 });
    }

    return NextResponse.json({
      form: {
        id: form.id,
        title: form.title,
        description: form.description,
        token: form.token,
        isActive: form.isActive,
        allowMultipleResponses: form.allowMultipleResponses,
        submissionCount: form.submissionCount,
      },
    });
  } catch (error) {
    console.error("Public feedback fetch error:", error);
    return NextResponse.json(
      { error: "Failed to load feedback form" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params;
    const result = await submitFeedbackResponse(token, await req.json());

    return NextResponse.json({
      success: true,
      responseId: result.response.id,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit feedback";
    const status =
      message === "Feedback link not found"
        ? 404
        : message === "This feedback link is no longer active"
          ? 410
          : message.includes("already been submitted")
            ? 409
            : message.includes("required")
              ? 400
              : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
