import { NextRequest, NextResponse } from "next/server";
import { playVideoFromFirestore } from "@/lib/server/firestoreVideoService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const result = await playVideoFromFirestore({
      videoId: params.id,
      mode: "admin",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const message = error.message || "Failed to prepare video playback";
    const status = message === "Video not found" ? 404 : 500;

    console.error("Admin video play error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
