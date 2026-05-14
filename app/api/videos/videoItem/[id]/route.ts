import { NextRequest } from "next/server";
import {
  deleteVideoItem,
  updateVideoItem,
} from "@/lib/server/videoItemService";
import { requireAdminSession } from "@/lib/server/adminAccess";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const params = await context.params;
    const body = await req.json();
    await updateVideoItem(params.id, body);
    return Response.json({ success: true });
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Could not update video" },
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
  await deleteVideoItem(params.id)
  return Response.json({ success: true })
}
