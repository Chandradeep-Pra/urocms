import { NextRequest, NextResponse } from "next/server";
import { buildDriveVideoStreamResponse } from "@/lib/server/videoStreamService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    return await buildDriveVideoStreamResponse({
      videoId: params.id,
      rangeHeader: req.headers.get("range"),
      mode: "admin",
    });
  } catch (error: any) {
    const message = error.message || "Failed to stream video";
    const status = error.status || 500;
    console.error("Admin video stream error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
