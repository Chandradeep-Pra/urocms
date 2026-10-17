import { NextRequest, NextResponse } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { FeedbackError, submitExperienceFeedback } from "@/lib/server/experienceFeedbackService";

export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new FeedbackError("Invalid feedback payload.");
    if (body.platform !== undefined && body.platform !== "web" && body.platform !== "mobile") throw new FeedbackError("Invalid feedback platform.");
    return NextResponse.json(await submitExperienceFeedback(body, { platform: body.platform === "web" ? "web" : "mobile", user: auth.user }), { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof FeedbackError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Invalid feedback payload." }, { status: 400 });
    console.error("Authenticated experience feedback could not be saved.");
    return NextResponse.json({ error: "Unable to save feedback. You can retry or skip." }, { status: 500 });
  }
}
