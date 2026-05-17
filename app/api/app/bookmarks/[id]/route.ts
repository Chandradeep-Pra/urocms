import { NextRequest, NextResponse } from "next/server";
import {
  getBookmarksCollection,
  updateUserStats,
} from "@/lib/server/candidateProgress";
import { requireAppUser } from "@/lib/server/appSession";

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const bookmarkRef = getBookmarksCollection(auth.user.uid).doc(id);
    const bookmarkDoc = await bookmarkRef.get();

    if (!bookmarkDoc.exists) {
      return NextResponse.json({ error: "Bookmark not found" }, { status: 404 });
    }

    await bookmarkRef.delete();

    const now = new Date().toISOString();
    await updateUserStats(auth.user.uid, (current) => ({
      bookmarksCount: Math.max(0, current.bookmarksCount - 1),
      lastActivityAt: now,
    }));

    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("Bookmark delete error:", error);
    return NextResponse.json({ error: "Failed to delete bookmark" }, { status: 500 });
  }
}
