import { NextRequest, NextResponse } from "next/server";
import { FeedbackError, submitExperienceFeedback } from "@/lib/server/experienceFeedbackService";

export async function POST(req: NextRequest) {
  try {
    return NextResponse.json(await submitExperienceFeedback(await req.json(), { platform: "web", user: null }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof FeedbackError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid feedback payload." }, { status: 400 });
    console.error("Public experience feedback could not be saved.");
    return NextResponse.json({ error: "Unable to save feedback. You can retry or skip." }, { status: 500 });
  }
}
