import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

function normalizeSortOrder(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeTier(value: unknown) {
  return value === "paid" ? "paid" : "free";
}

export async function GET(req: NextRequest) {
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

    const sectionMeta = new Map(
      sectionsSnapshot.docs.map((doc, index) => {
        const data = doc.data() ?? {};
        return [
          doc.id,
          {
            title: String(data.title || ""),
            accessTier: normalizeTier(data.accessTier),
            imageUrl: String(data.imageUrl || data.folderImageUrl || data.thumbnailUrl || ""),
            sortOrder: normalizeSortOrder(data.sortOrder, index + 1),
          },
        ];
      })
    );

    const videos = snapshot.docs
      .map((doc, index) => {
        const data = doc.data() ?? {};
        const section = sectionMeta.get(String(data.sectionId || ""));
        const accessTier = normalizeTier(data.accessTier);
        const sectionAccessTier = normalizeTier(data.sectionAccessTier || section?.accessTier);
        const effectiveAccessTier =
          accessTier === "paid" || sectionAccessTier === "paid" ? "paid" : "free";

        return {
          id: doc.id,
          ...data,
          accessTier,
          sectionAccessTier,
          effectiveAccessTier,
          sortOrder: normalizeSortOrder(data.sortOrder, index + 1),
          access: {
            allowed: effectiveAccessTier === "free",
            mode: effectiveAccessTier === "free" ? "full" : "locked",
            reason:
              effectiveAccessTier === "free"
                ? null
                : "This video is locked until the matching course or section is unlocked.",
          },
          requiresGoogleSession: false,
          isSyncedToCloudStorage: Boolean(data.storagePath),
        };
      })
      .filter((video) => (video.provider === "drive" ? Boolean(video.storagePath) : true))
      .sort((a, b) => {
        const sectionA = sectionMeta.get(String(a.sectionId || ""))?.sortOrder ?? Number.MAX_SAFE_INTEGER;
        const sectionB = sectionMeta.get(String(b.sectionId || ""))?.sortOrder ?? Number.MAX_SAFE_INTEGER;
        if (sectionA !== sectionB) return sectionA - sectionB;
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return String(a.title || "").localeCompare(String(b.title || ""));
      });

    const sections = sectionsSnapshot.docs
      .map((doc, index) => {
        const data = doc.data() ?? {};
        const sectionVideos = videos.filter((video) => video.sectionId === doc.id);
        const sectionImageUrl = String(data.imageUrl || data.folderImageUrl || data.thumbnailUrl || "");

        return {
          id: doc.id,
          title: String(data.title || ""),
          imageUrl: sectionImageUrl,
          folderImageUrl: sectionImageUrl,
          accessTier: normalizeTier(data.accessTier),
          sortOrder: normalizeSortOrder(data.sortOrder, index + 1),
          access: {
            allowed: sectionVideos.some((video) => video.access?.mode === "full"),
            mode: sectionVideos.some((video) => video.access?.mode === "full") ? "partial" : "locked",
          },
          videoCount: sectionVideos.length,
          videos: sectionVideos,
        };
      })
      .filter((section) => (sectionId ? section.id === sectionId : true))
      .filter((section) => section.videoCount > 0)
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
        return a.title.localeCompare(b.title);
      });

    return NextResponse.json(
      {
        tier: "public",
        sectionCount: sections.length,
        videoCount: videos.length,
        sections,
        videos,
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    console.error("Public video library error:", error);
    return NextResponse.json({ error: "Failed to load public video library" }, { status: 500 });
  }
}
