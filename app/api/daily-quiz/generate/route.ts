import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { generateDailyQuizFromTopic } from "@/lib/server/dailyQuizService";

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const body = await req.json();
    return NextResponse.json({
      quiz: await generateDailyQuizFromTopic(body.topic),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to generate quiz";
    console.error("AI Generate Error:", error);
    return NextResponse.json(
      { error: message },
      { status: message === "Topic required" ? 400 : 500 }
    );
  }
}
