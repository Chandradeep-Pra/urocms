import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";
import { isPaidTier } from "@/lib/appAccess";
import {
  fetchDriveFileStream,
  getDriveFileMetadata,
  grantDriveAccessToEmail,
} from "@/lib/server/googleDrive";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const params = await context.params;
    const videoDoc = await adminDb.collection("videoItems").doc(params.id).get();

    if (!videoDoc.exists) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const video = videoDoc.data() ?? {};
    if (video.provider !== "drive" || !video.driveFileId) {
      return NextResponse.json(
        { error: "This video is not a Drive file" },
        { status: 400 }
      );
    }

    const accessTier = video.accessTier === "paid" ? "paid" : "free";
    if (accessTier === "paid" && !isPaidTier(auth.user.tier)) {
      return NextResponse.json({ error: "Paid access required" }, { status: 403 });
    }

    const accessEmail = auth.user.googleAccessEmail || auth.user.email || null;
    if (accessTier === "paid" && accessEmail) {
      await grantDriveAccessToEmail(accessEmail, [video.driveFileId]);
    }

    const metadata = await getDriveFileMetadata(video.driveFileId);
    const upstream = await fetchDriveFileStream(
      video.driveFileId,
      req.headers.get("range")
    );

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
      if (value) headers.set(header, value);
    });

    headers.set("content-type", metadata.mimeType);
    headers.set("content-disposition", `inline; filename="${metadata.name}"`);
    headers.set("cache-control", "private, max-age=0, must-revalidate");
    headers.set("x-content-type-options", "nosniff");

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers,
    });
  } catch (error) {
    console.error("App video stream error:", error);
    return NextResponse.json({ error: "Failed to stream video" }, { status: 500 });
  }
}
