import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { loadAdminVideoLibrary } from "@/lib/server/videoAdminService";

export async function GET(req: NextRequest) {
  const { response, session } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    return NextResponse.json(
      await loadAdminVideoLibrary({
        sectionId: searchParams.get("sectionId"),
        userId: session!.uid,
      })
    );
  } catch (error) {
    console.error("Video library error:", error);
    return NextResponse.json({ error: "Failed to load library" }, { status: 500 });
  }
}
