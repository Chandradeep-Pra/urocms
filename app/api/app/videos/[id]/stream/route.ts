import { NextRequest, NextResponse } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { buildDriveVideoStreamResponse } from "@/lib/server/videoStreamService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const params = await context.params;
    return await buildDriveVideoStreamResponse({
      videoId: params.id,
      rangeHeader: req.headers.get("range"),
      mode: "app",
      user: auth.user,
    });
  } catch (error: any) {
    const message = error.message || "Failed to stream video";
    const status = error.status || 500;
    console.error("App video stream error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
