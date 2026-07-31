import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import { requireAppUser } from "@/lib/server/appSession";
import { privateJsonResponse } from "@/lib/server/apiMetrics";
import type { DocumentData, Query } from "firebase-admin/firestore";

type VideoDocument = Record<string, unknown> & {
  sectionId?: unknown;
  provider?: unknown;
  storagePath?: unknown;
  title?: unknown;
};

function normalizeSortOrder(value: unknown, fallback: number) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

export async function GET(req: NextRequest) {
  const startedAt = performance.now();
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const accessContext = await buildAppContentAccessContext(auth.user);
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId");
    const includeVideos = searchParams.get("includeVideos") !== "0";

    let query: Query<DocumentData> = getAdminDb().collection("videoItems");

    if (sectionId) {
      query = query.where("sectionId", "==", sectionId);
    }

    const [snapshot, sectionsSnapshot] = await Promise.all([
      query.get(),
      getAdminDb().collection("videoSections").get(),
    ]);
    const sectionOrderMap = new Map(
      sectionsSnapshot.docs.map((doc, index) => [
        doc.id,
        normalizeSortOrder(doc.data().sortOrder, index + 1),
      ])
    );

    const allVideos = snapshot.docs
      .map((doc, index) => {
        const data = doc.data() as VideoDocument;
        return ({
        id: doc.id,
        ...data,
        accessTier: data.accessTier === "paid" ? "paid" : "free",
        effectiveAccessTier:
          data.effectiveAccessTier === "paid" ? "paid" : "free",
        sortOrder: normalizeSortOrder(data.sortOrder, index + 1),
        access: {
          allowed:
            data.effectiveAccessTier === "paid"
              ? auth.user.tier === "paid"
              : auth.user.tier !== "guest",
          requiredTier:
            data.effectiveAccessTier === "paid" ? "paid" : "free",
        },
        requiresGoogleSession: false,
        isSyncedToCloudStorage: Boolean(data.storagePath),
      });
      })
      .map((video) => {
        const access = accessContext.getVideoAccess({
          id: String(video.id),
          sectionId: typeof video.sectionId === "string" ? video.sectionId : null,
          effectiveAccessTier: typeof video.effectiveAccessTier === "string" ? video.effectiveAccessTier : null,
          accessTier: typeof video.accessTier === "string" ? video.accessTier : null,
        });

        return {
          ...video,
          sortOrder: normalizeSortOrder(video.sortOrder, 0),
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
    ).sort((a, b) => {
      const sectionA = sectionOrderMap.get(String(a.sectionId || "")) ?? Number.MAX_SAFE_INTEGER;
      const sectionB = sectionOrderMap.get(String(b.sectionId || "")) ?? Number.MAX_SAFE_INTEGER;
      if (sectionA !== sectionB) {
        return sectionA - sectionB;
      }

      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }

      return String(a.title || "").localeCompare(String(b.title || ""));
    });

    const sections = sectionsSnapshot.docs
      .map((doc, index) => {
        const data = doc.data() ?? {};
        const sectionVideos = videos
          .filter((video) => video.sectionId === doc.id)
          .sort((a, b) => {
            if (a.sortOrder !== b.sortOrder) {
              return a.sortOrder - b.sortOrder;
            }

            return String(a.title || "").localeCompare(String(b.title || ""));
          });

        const sectionImageUrl = String(
          data.imageUrl || data.folderImageUrl || data.thumbnailUrl || ""
        );

        return {
          id: doc.id,
          title: String(data.title || ""),
          imageUrl: sectionImageUrl,
          folderImageUrl: sectionImageUrl,
          accessTier: data.accessTier === "paid" ? "paid" : "free",
          sortOrder: normalizeSortOrder(data.sortOrder, index + 1),
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
          videos: includeVideos ? sectionVideos : [],
        };
      })
      .filter((section) => (sectionId ? section.id === sectionId : true))
      .filter((section) => section.videoCount > 0)
      .sort((a, b) => {
        if (a.sortOrder !== b.sortOrder) {
          return a.sortOrder - b.sortOrder;
        }

        return a.title.localeCompare(b.title);
      });

    return privateJsonResponse(
      {
        tier: auth.user.tier,
        sectionCount: sections.length,
        videoCount: videos.length,
        sections,
        videos: includeVideos ? videos : [],
      },
      {
        route: "/api/app/videos/library",
        method: "GET",
        startedAt,
        userId: auth.user.uid,
        itemCount: videos.length,
      }
    );
  } catch (error) {
    console.error("App video library error:", error);
    return privateJsonResponse(
      { error: "Failed to load library" },
      {
        status: 500,
        route: "/api/app/videos/library",
        method: "GET",
        startedAt,
        userId: auth.user.uid,
      }
    );
  }
}
