import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { pickUrologicsDailyQuizTopic } from "@/lib/server/dailyQuizService";

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const topicPick = await pickUrologicsDailyQuizTopic();
    return NextResponse.json(topicPick);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to pick daily quiz topic";
    console.error("Daily quiz topic pick error:", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
