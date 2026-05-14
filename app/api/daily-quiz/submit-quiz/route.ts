import { NextRequest, NextResponse } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { submitTodayDailyQuizAttempt } from "@/lib/server/dailyQuizService";

export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const { selectedIndex } = await req.json();
    return NextResponse.json(
      await submitTodayDailyQuizAttempt({
        uid: auth.user.uid,
        selectedIndex,
      })
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed";
    const status =
      message === "Invalid submission" || message === "Already submitted"
        ? 400
        : message === "Quiz not found"
          ? 404
          : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
