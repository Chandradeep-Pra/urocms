import { NextRequest, NextResponse } from "next/server";
import {
  getConfiguredDriveVideoFolderId,
  listDriveFolderContents,
} from "@/lib/server/googleDrive";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const folderId =
      searchParams.get("folderId")?.trim() || getConfiguredDriveVideoFolderId();

    if (!folderId) {
      return NextResponse.json(
        { error: "Drive folder id is required" },
        { status: 400 }
      );
    }

    const { folders, videos } = await listDriveFolderContents(folderId);

    return NextResponse.json({
      folderId,
      folderCount: folders.length,
      count: videos.length,
      folders,
      videos,
    });
  } catch (error) {
    console.error("Drive library fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Drive videos" },
      { status: 500 }
    );
  }
}
