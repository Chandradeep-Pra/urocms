import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { getDailyQuizDetails } from "@/lib/server/dailyQuizService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    return NextResponse.json(await getDailyQuizDetails(id));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch quiz details";
    console.error("Daily quiz detail fetch error:", error);
    return NextResponse.json(
      { error: message },
      { status: message === "Quiz not found" ? 404 : 500 }
    );
  }
}
