import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { listPublishableFeedbackResponses } from "@/lib/server/feedbackFormService";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    return NextResponse.json({
      responses: await listPublishableFeedbackResponses(),
    });
  } catch (error) {
    console.error("Publishable feedback fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch publishable feedback" },
      { status: 500 }
    );
  }
}
