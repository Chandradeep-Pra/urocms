import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const { searchParams } = new URL(req.url);
    const sectionId = searchParams.get("sectionId");

    let query = adminDb.collection("videoItems");

    if (sectionId) {
      query = query.where("sectionId", "==", sectionId);
    }

    const snapshot = await query.get();
    const allVideos = snapshot.docs.map((doc) => ({
      id: doc.id,
      accessTier: "free",
      ...doc.data(),
    }));

    const videos =
      auth.user.tier === "paid"
        ? allVideos
        : allVideos.filter((video) => video.accessTier !== "paid");

    return NextResponse.json({
      tier: auth.user.tier,
      videos,
    });
  } catch (error) {
    console.error("App video library error:", error);
    return NextResponse.json({ error: "Failed to load library" }, { status: 500 });
  }
}
