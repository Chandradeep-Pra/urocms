import { NextRequest } from "next/server";
import {
  deleteVideoSection,
  updateVideoSection,
} from "@/lib/server/videoSectionService";
import { requireAdminSession } from "@/lib/server/adminAccess";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const params = await context.params;
    const { title, accessTier } = await req.json();
    await updateVideoSection(params.id, { title, accessTier });
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Could not update section" },
      { status: 400 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  const params = await context.params;
  await deleteVideoSection(params.id);
  return Response.json({ success: true })
}
