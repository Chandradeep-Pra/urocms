import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { loadDriveFolderLibrary } from "@/lib/server/videoAdminService";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    return NextResponse.json(
      await loadDriveFolderLibrary(searchParams.get("folderId"))
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch Drive videos";
    const status = message === "Drive folder id is required" ? 400 : 500;
    console.error("Drive library fetch error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
