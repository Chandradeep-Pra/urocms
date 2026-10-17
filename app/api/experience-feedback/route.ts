import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { FeedbackError, listExperienceFeedback } from "@/lib/server/experienceFeedbackService";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;
  try {
    const params = req.nextUrl.searchParams;
    return NextResponse.json(await listExperienceFeedback({ category: params.get("category"), cursor: params.get("cursor"), limit: params.get("limit") }), { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    if (error instanceof FeedbackError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Feedback inbox could not be loaded.");
    return NextResponse.json({ error: "Unable to load feedback. Please try again." }, { status: 500 });
  }
}
