
import { NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { fetchDriveFileStream } from "@/lib/server/googleDrive";
import { getCloudStorageReadStream } from "@/lib/server/googleCloudStorage";

export type DriveVideoStreamMode = "admin" | "app" | "public";

export async function buildDriveVideoStreamResponse(input: {
  videoId: string;
  rangeHeader?: string | null;
  mode?: DriveVideoStreamMode;
  user?: { uid?: string | null; email?: string | null } | null;
}) {
  const videoRef = getAdminDb().collection("videoItems").doc(input.videoId);
  const videoDoc = await videoRef.get();

  if (!videoDoc.exists) {
    const error = new Error("Video not found") as Error & { status?: number };
    error.status = 404;
    throw error;
  }

  const data = videoDoc.data() ?? {};
  const storagePath = typeof data.storagePath === "string" ? data.storagePath.trim() : "";
  const storageBucket =
    typeof data.storageBucket === "string" && data.storageBucket.trim()
      ? data.storageBucket.trim()
      : undefined;

  if (storagePath) {
    const result = await getCloudStorageReadStream({
      storagePath,
      storageBucket,
      rangeHeader: input.rangeHeader,
    });

    if (result.stream === null) {
      return new NextResponse(null, {
        status: result.status,
        headers: result.headers as unknown as HeadersInit,
      });
    }

    return new NextResponse(result.stream as any, {
      status: result.status,
      headers: result.headers as unknown as HeadersInit,
    });
  }

  const driveFileId = typeof data.driveFileId === "string" ? data.driveFileId.trim() : "";
  if (!driveFileId) {
    const error = new Error("Video source is not configured") as Error & { status?: number };
    error.status = 500;
    throw error;
  }

  const driveResponse = await fetchDriveFileStream(driveFileId, input.rangeHeader);
  const headers = new Headers(driveResponse.headers);

  if (headers.get("content-length")) {
    headers.set("content-length", headers.get("content-length") || "");
  }

  headers.set("accept-ranges", headers.get("accept-ranges") || "bytes");
  headers.set("cache-control", "private, max-age=3600");
  headers.set("x-accel-buffering", "no");

  return new NextResponse(driveResponse.body, {
    status: driveResponse.status,
    headers,
  });
}
