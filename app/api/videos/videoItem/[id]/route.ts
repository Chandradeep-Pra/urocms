import {
  deleteVideoItem,
  updateVideoItem,
} from "@/lib/server/videoItemService";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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
  req: Request,
   context: { params: Promise<{ id: string }> }
) {
    const params = await context.params;
  await deleteVideoItem(params.id)
  return Response.json({ success: true })
}
