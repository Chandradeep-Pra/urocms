import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { loadDriveFoldersCatalog } from "@/lib/server/videoAdminService";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    return NextResponse.json(await loadDriveFoldersCatalog());
  } catch (error) {
    console.error("Drive folders fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch Drive folders" },
      { status: 500 }
    );
  }
}
