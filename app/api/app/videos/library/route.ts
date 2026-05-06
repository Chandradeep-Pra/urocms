import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId");

    let query = adminDb.collection("videoItems");

    if (sectionId) {
      query = query.where("sectionId", "==", sectionId);
    }

    const [snapshot, sectionsSnapshot] = await Promise.all([
      query.get(),
      adminDb.collection("videoSections").get(),
    ]);

    const allVideos = snapshot.docs.map((doc) => ({
      id: doc.id,
      accessTier: doc.data().accessTier === "paid" ? "paid" : "free",
      effectiveAccessTier:
        doc.data().effectiveAccessTier === "paid" ? "paid" : "free",
      requiresGoogleSession: false,
      isSyncedToCloudStorage: Boolean(doc.data().storagePath),
      ...doc.data(),
    }));

    const visibleByTier =
      auth.user.tier === "paid"
        ? allVideos
        : allVideos.filter((video) => video.effectiveAccessTier !== "paid");

    const videos = visibleByTier.filter((video) =>
      video.provider === "drive" ? Boolean(video.storagePath) : true
    );

    const sections = sectionsSnapshot.docs
      .map((doc) => {
        const data = doc.data() ?? {};
        const sectionVideos = videos.filter((video) => video.sectionId === doc.id);

        return {
          id: doc.id,
          title: String(data.title || ""),
          accessTier: data.accessTier === "paid" ? "paid" : "free",
          effectiveAccessTier:
            sectionVideos.some((video) => video.effectiveAccessTier === "paid") ||
            data.accessTier === "paid"
              ? "paid"
              : "free",
          videoCount: sectionVideos.length,
          videos: sectionVideos,
        };
      })
      .filter((section) => (sectionId ? section.id === sectionId : true))
      .filter((section) => section.videoCount > 0);

    return NextResponse.json({
      tier: auth.user.tier,
      sectionCount: sections.length,
      videoCount: videos.length,
      sections,
      videos,
    });
  } catch (error) {
    console.error("App video library error:", error);
    return NextResponse.json({ error: "Failed to load library" }, { status: 500 });
  }
}
