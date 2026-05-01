import {
  deleteVideoSection,
  updateVideoSection,
} from "@/lib/server/videoSectionService";

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
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
  req: Request,
context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  await deleteVideoSection(params.id);
  return Response.json({ success: true })
}
