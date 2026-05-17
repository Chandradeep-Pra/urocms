import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  getDailyQuizNoStoreHeaders,
  getLiveDailyQuiz,
  saveTodayDailyQuiz,
} from "@/lib/server/dailyQuizService";
import { publishNotification } from "@/lib/server/notificationService";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const payload = await req.json();
    await saveTodayDailyQuiz(payload);
    await publishNotification({
      kind: "daily-quiz",
      title: "New Daily Quiz Posted",
      body: String(payload?.question || "Today's daily quiz is now live.").trim(),
      sourceType: "dailyQuiz",
      deepLink: "/daily-quiz",
      audience: "all",
    });
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save quiz";
    return NextResponse.json(
      { error: message },
      { status: message === "Invalid quiz payload" ? 400 : 500 }
    );
  }
}

export async function GET() {
  try {
    return NextResponse.json(
      { quiz: await getLiveDailyQuiz() },
      {
        headers: getDailyQuizNoStoreHeaders(),
      }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}
