import { adminDb } from "@/lib/firebaseAdmin"
import { parseVideo } from "@/utils/urlParser"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const sectionId = searchParams.get("sectionId")

  let query = adminDb.collection("videoItems");

  if (sectionId) {
    query = query.where("sectionId", "==", sectionId)
  }

  const snapshot = await query.get()

  const videos = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))

  return Response.json(videos)
}

export async function POST(req: Request) {
  const body = await req.json()
  const { title, description, videoUrl, sectionId } = body

  if (!title || !videoUrl) {
    return Response.json({ error: "Missing fields" }, { status: 400 })
  }

  const parsed = parseVideo(videoUrl)

  const docRef = await adminDb.collection("videoItems").add({
    title,
    description,
    videoUrl,
    provider: parsed.provider,
    driveFileId: parsed.driveFileId || null,
    sectionId,
    createdAt: new Date()
  })

  return Response.json({ id: docRef.id })
}