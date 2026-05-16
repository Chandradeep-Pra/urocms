import { NextRequest, NextResponse } from "next/server";
import { getVideoProgressCollection } from "@/lib/server/candidateProgress";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const snapshot = await getVideoProgressCollection(auth.user.uid)
      .orderBy("lastWatchedAt", "desc")
      .get();

    const items = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      count: items.length,
      items,
    });
  } catch (error) {
    console.error("Video progress fetch error:", error);
    return NextResponse.json({ error: "Failed to load video progress" }, { status: 500 });
  }
}
