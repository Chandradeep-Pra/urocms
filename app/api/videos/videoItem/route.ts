import {
  createVideoItem,
  listVideoItems,
} from "@/lib/server/videoItemService";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sectionId = searchParams.get("sectionId")

  const videos = await listVideoItems(sectionId || undefined);
  return Response.json(videos)
}

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const result = await createVideoItem(body);
    return Response.json(result)
  } catch (error: any) {
    const message = error.message || "Could not create video";
    const status = message.includes("already attached") ? 409 : 400;
    return Response.json({ error: message }, { status })
  }
}
