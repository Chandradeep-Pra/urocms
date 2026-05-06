import { NextRequest, NextResponse } from "next/server";
import { syncDriveVideoToStorage } from "@/lib/server/firestoreVideoService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const params = await context.params;
    const result = await syncDriveVideoToStorage(params.id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    const message = error.message || "Failed to sync video to Google Cloud Storage";
    const status =
      message === "Video not found"
        ? 404
        : message.includes("Only Drive videos")
          ? 400
          : 500;

    console.error("Video sync to Google Cloud Storage error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
