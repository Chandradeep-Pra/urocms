import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  getDailyQuizNoStoreHeaders,
  listDailyQuizHistory,
} from "@/lib/server/dailyQuizService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    return NextResponse.json(
      { quizzes: await listDailyQuizHistory() },
      {
        headers: getDailyQuizNoStoreHeaders(),
      }
    );
  } catch (error) {
    console.error("Daily quiz history fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz history" },
      { status: 500 }
    );
  }
}
