import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { prepareAdminVideoPlayback } from "@/lib/server/videoAdminService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const params = await context.params;
    return NextResponse.json(await prepareAdminVideoPlayback(params.id));
  } catch (error: any) {
    const message = error.message || "Failed to prepare video playback";
    const status = message === "Video not found" ? 404 : 500;

    console.error("Admin video play error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
