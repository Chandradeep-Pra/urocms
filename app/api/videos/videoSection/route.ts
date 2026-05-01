import {
  createVideoSection,
  listVideoSections,
} from "@/lib/server/videoSectionService";

export async function GET() {
  const sections = await listVideoSections();
  return Response.json(sections)
}

export async function POST(req: Request) {
  try {
    const { title, accessTier } = await req.json()
    const result = await createVideoSection({ title, accessTier });
    return Response.json(result)
  } catch (error: any) {
    return Response.json(
      { error: error.message || "Could not create section" },
      { status: 400 }
    )
  }
}
