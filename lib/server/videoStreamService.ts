import { Readable } from "node:stream";
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import { type AppUserSession } from "@/lib/server/appSession";
import { getCloudStorageReadStream } from "@/lib/server/googleCloudStorage";
import {
  fetchDriveFileStream,
  getDriveFileDebugInfo,
  getDriveFileMetadata,
  grantDriveAccessToEmail,
} from "@/lib/server/googleDrive";

function normalizeEffectiveVideoTier(video: Record<string, unknown>) {
  return video.effectiveAccessTier === "paid" || video.accessTier === "paid"
    ? "paid"
    : "free";
}

export async function buildDriveVideoStreamResponse(params: {
  videoId: string;
  rangeHeader?: string | null;
  mode: "admin" | "app";
  user?: AppUserSession;
}) {
  const videoDoc = await getAdminDb().collection("videoItems").doc(params.videoId).get();

  if (!videoDoc.exists) {
    const error = new Error("Video not found");
    (error as Error & { status?: number }).status = 404;
    throw error;
  }

  const video = videoDoc.data() ?? {};
  if (video.storagePath) {
    const accessTier = normalizeEffectiveVideoTier(video);
    if (params.mode === "app" && params.user) {
      const accessContext = await buildAppContentAccessContext(params.user);
      const access = accessContext.getVideoAccess({
        id: params.videoId,
        sectionId: typeof video.sectionId === "string" ? video.sectionId : null,
        effectiveAccessTier: accessTier,
        accessTier: typeof video.accessTier === "string" ? video.accessTier : null,
      });

      if (access.mode !== "full") {
        const error = new Error(access.reason || "Video access is locked");
        (error as Error & { status?: number }).status = 403;
        throw error;
      }
    }

    const storageResponse = await getCloudStorageReadStream({
      storagePath: String(video.storagePath),
      storageBucket: typeof video.storageBucket === "string" ? video.storageBucket : undefined,
      rangeHeader: params.rangeHeader,
    });
    const headers = new Headers();
    Object.entries(storageResponse.headers).forEach(([name, value]) => {
      if (typeof value === "string") {
        headers.set(name, value);
      }
    });
    headers.set("content-disposition", `inline; filename="${String(video.title || "video")}.mp4"`);
    headers.set("cache-control", "private, max-age=0, must-revalidate");
    headers.set("x-content-type-options", "nosniff");

    return new NextResponse(Readable.toWeb(storageResponse.stream) as never, {
      status: storageResponse.status,
      headers,
    });
  }

  if (video.provider !== "drive" || !video.driveFileId) {
    const error = new Error("This video is not a Drive file");
    (error as Error & { status?: number }).status = 400;
    throw error;
  }

  const accessTier = normalizeEffectiveVideoTier(video);
  if (params.mode === "app" && params.user) {
    const accessContext = await buildAppContentAccessContext(params.user);
    const access = accessContext.getVideoAccess({
      id: params.videoId,
      sectionId: typeof video.sectionId === "string" ? video.sectionId : null,
      effectiveAccessTier: accessTier,
      accessTier: typeof video.accessTier === "string" ? video.accessTier : null,
    });

    if (access.mode !== "full") {
      const error = new Error(access.reason || "Video access is locked");
      (error as Error & { status?: number }).status = 403;
      throw error;
    }
  }

  const accessEmail = params.user?.googleAccessEmail || params.user?.email || null;
  if (params.mode === "app" && accessTier === "paid" && accessEmail) {
    await grantDriveAccessToEmail(accessEmail, [video.driveFileId]);
  }

  const metadata = await getDriveFileMetadata(video.driveFileId);
  if (params.mode === "admin") {
    const debugInfo = await getDriveFileDebugInfo(video.driveFileId);
    console.log("Admin Drive debug info:", debugInfo);
  }

  const upstream = await fetchDriveFileStream(video.driveFileId, params.rangeHeader);
  const headers = new Headers();
  const passthroughHeaders = [
    "content-type",
    "content-length",
    "content-range",
    "accept-ranges",
    "etag",
    "last-modified",
  ];

  passthroughHeaders.forEach((header) => {
    const value = upstream.headers.get(header);
    if (value) {
      headers.set(header, value);
    }
  });

  headers.set("content-type", metadata.mimeType);
  headers.set("content-disposition", `inline; filename="${metadata.name}"`);
  headers.set("cache-control", "private, max-age=0, must-revalidate");
  headers.set("x-content-type-options", "nosniff");

  return new NextResponse(upstream.body, {
    status: upstream.status,
    headers,
  });
}
