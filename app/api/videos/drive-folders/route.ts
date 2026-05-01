import { NextResponse } from "next/server";
import {
  getConfiguredDriveVideoFolderId,
  listAccessibleDriveFolders,
} from "@/lib/server/googleDrive";

export async function GET() {
  try {
    const folders = await listAccessibleDriveFolders();
    const configuredFolderId = getConfiguredDriveVideoFolderId() || null;

    return NextResponse.json({
      configuredFolderId,
      folders,
    });
  } catch (error) {
    console.error("Drive folders fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Drive folders" },
      { status: 500 }
    );
  }
}
