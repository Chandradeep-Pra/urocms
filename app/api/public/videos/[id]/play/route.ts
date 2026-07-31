import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { playVideoFromFirestore } from "@/lib/server/firestoreVideoService";
import { privateJsonResponse } from "@/lib/server/apiMetrics";

function normalizeTier(value: unknown) {
  return value === "paid" ? "paid" : "free";
}

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const startedAt = performance.now();
  try {
    const { id } = await context.params;
    const videoDoc = await getAdminDb().collection("videoItems").doc(id).get();

    if (!videoDoc.exists) {
      return privateJsonResponse(
        { error: "Video not found" },
        {
          status: 404,
          route: "/api/public/videos/[id]/play",
          method: "GET",
          startedAt,
        }
      );
    }

    const video = videoDoc.data() ?? {};
    let sectionAccessTier = normalizeTier(video.sectionAccessTier);

    if (video.sectionId) {
      const sectionDoc = await getAdminDb().collection("videoSections").doc(String(video.sectionId)).get();
      sectionAccessTier = normalizeTier(sectionDoc.data()?.accessTier || sectionAccessTier);
    }

    const effectiveAccessTier =
      normalizeTier(video.accessTier) === "paid" || sectionAccessTier === "paid"
        ? "paid"
        : "free";

    if (effectiveAccessTier !== "free") {
      return privateJsonResponse(
        { error: "Paid access required" },
        {
          status: 403,
          route: "/api/public/videos/[id]/play",
          method: "GET",
          startedAt,
        }
      );
    }

    const result = await playVideoFromFirestore({
      videoId: id,
      mode: "app",
    });

    return privateJsonResponse(result, {
      route: "/api/public/videos/[id]/play",
      method: "GET",
      startedAt,
    });
  } catch (error: any) {
    const message = error.message || "Failed to prepare public video playback";
    const status = message === "Video not found" ? 404 : error.status || 500;

    console.error("Public video play error:", error);
    return privateJsonResponse(
      { error: message },
      {
        status,
        route: "/api/public/videos/[id]/play",
        method: "GET",
        startedAt,
      }
    );
  }
}
