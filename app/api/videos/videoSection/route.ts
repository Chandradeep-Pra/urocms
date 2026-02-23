import { adminDb } from "@/lib/firebaseAdmin"

export async function GET() {
  const snapshot = await adminDb.collection("videoSections").get()

  const sections = snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }))

  return Response.json(sections)
}

export async function POST(req: Request) {
  const { title } = await req.json()

  if (!title) {
    return Response.json({ error: "Title required" }, { status: 400 })
  }

  const docRef = await adminDb.collection("videoSections").add({
    title,
    createdAt: new Date()
  })

  return Response.json({ id: docRef.id })
}