import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { buildDriveVideoStreamResponse } from "@/lib/server/videoStreamService";

function normalizeTier(value: unknown) {
  return value === "paid" ? "paid" : "free";
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const videoDoc = await adminDb.collection("videoItems").doc(id).get();

    if (!videoDoc.exists) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const video = videoDoc.data() ?? {};
    let sectionAccessTier = normalizeTier(video.sectionAccessTier);

    if (video.sectionId) {
      const sectionDoc = await adminDb.collection("videoSections").doc(String(video.sectionId)).get();
      sectionAccessTier = normalizeTier(sectionDoc.data()?.accessTier || sectionAccessTier);
    }

    const effectiveAccessTier =
      normalizeTier(video.accessTier) === "paid" || sectionAccessTier === "paid"
        ? "paid"
        : "free";

    if (effectiveAccessTier !== "free") {
      return NextResponse.json({ error: "Paid access required" }, { status: 403 });
    }

    return await buildDriveVideoStreamResponse({
      videoId: id,
      rangeHeader: req.headers.get("range"),
      mode: "app",
    });
  } catch (error: any) {
    const message = error.message || "Failed to stream public video";
    const status = message === "Video not found" ? 404 : error.status || 500;

    console.error("Public video stream error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
