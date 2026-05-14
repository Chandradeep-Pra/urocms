import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { syncAdminVideoToStorage } from "@/lib/server/videoAdminService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const params = await context.params;
    const result = await syncAdminVideoToStorage(params.id);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    const message = error.message || "Failed to sync video to Google Cloud Storage";
    const status =
      message === "Video not found"
        ? 404
        : message.includes("Only Drive videos")
          ? 400
          : 500;

    console.error("Video sync to Google Cloud Storage error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
