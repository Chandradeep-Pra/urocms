import { NextRequest } from "next/server";
import {
  createVideoSection,
  listVideoSections,
} from "@/lib/server/videoSectionService";
import { requireAdminSession } from "@/lib/server/adminAccess";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  const sections = await listVideoSections();
  return Response.json(sections)
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

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
