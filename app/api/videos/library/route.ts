import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const userDoc = await adminDb.collection("users").doc(decoded.uid).get();

    const tier = userDoc.exists ? userDoc.data()?.tier ?? "guest" : "guest";
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
      tier === "paid"
        ? allVideos
        : allVideos.filter((video) => video.accessTier !== "paid");

    return NextResponse.json({ tier, videos });
  } catch (error) {
    console.error("Video library error:", error);
    return NextResponse.json({ error: "Failed to load library" }, { status: 500 });
  }
}
