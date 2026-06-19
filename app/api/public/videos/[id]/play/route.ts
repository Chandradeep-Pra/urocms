import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { playVideoFromFirestore } from "@/lib/server/firestoreVideoService";

function normalizeTier(value: unknown) {
  return value === "paid" ? "paid" : "free";
}

export async function GET(
  _req: NextRequest,
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

    const result = await playVideoFromFirestore({
      videoId: id,
      mode: "app",
    });

    return NextResponse.json(result);
  } catch (error: any) {
    const message = error.message || "Failed to prepare public video playback";
    const status = message === "Video not found" ? 404 : error.status || 500;

    console.error("Public video play error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
