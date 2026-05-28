import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const accessContext = await buildAppContentAccessContext(auth.user);
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
      access: {
        allowed:
          doc.data().effectiveAccessTier === "paid"
            ? auth.user.tier === "paid"
            : auth.user.tier !== "guest",
        requiredTier:
          doc.data().effectiveAccessTier === "paid" ? "paid" : "free",
      },
      requiresGoogleSession: false,
      isSyncedToCloudStorage: Boolean(doc.data().storagePath),
      ...doc.data(),
    })).map((video) => {
      const access = accessContext.getVideoAccess({
        id: String(video.id),
        sectionId: typeof video.sectionId === "string" ? video.sectionId : null,
        effectiveAccessTier: typeof video.effectiveAccessTier === "string" ? video.effectiveAccessTier : null,
        accessTier: typeof video.accessTier === "string" ? video.accessTier : null,
      });

      return {
        ...video,
        access: {
          allowed: access.allowed,
          mode: access.mode,
          previewLimit: access.previewLimit,
          reason: access.reason,
          courseIds: access.courseIds,
        },
      };
    });

    const videos = allVideos.filter((video) =>
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
          access: (() => {
            const unlockedVideos = sectionVideos.filter((video) => video.access?.mode === "full").length;
            if (unlockedVideos === sectionVideos.length && sectionVideos.length > 0) {
              return { allowed: true, mode: "full" as const };
            }
            if (unlockedVideos > 0) {
              return { allowed: true, mode: "partial" as const };
            }
            return { allowed: false, mode: "locked" as const };
          })(),
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
