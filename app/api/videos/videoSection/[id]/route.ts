import { adminDb } from "@/lib/firebaseAdmin"

export async function DELETE(
  req: Request,
context: { params: Promise<{ id: string }> }
) {
  const params = await context.params;
  await adminDb.collection("videoSections").doc(params.id).delete()

  return Response.json({ success: true })
}