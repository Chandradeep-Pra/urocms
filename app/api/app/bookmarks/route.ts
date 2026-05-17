import { NextRequest, NextResponse } from "next/server";
import {
  getBookmarksCollection,
  updateUserStats,
} from "@/lib/server/candidateProgress";
import { requireAppUser } from "@/lib/server/appSession";

const allowedBookmarkTypes = new Set([
  "video",
  "quiz-question",
  "mock-question",
  "viva-case",
] as const);

export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const type = String(body?.type ?? "").trim();
    const targetId = String(body?.targetId ?? "").trim();
    const parentId = body?.parentId ? String(body.parentId).trim() : null;
    const title = body?.title ? String(body.title).trim() : null;
    const notes = body?.notes ? String(body.notes).trim() : null;

    if (!allowedBookmarkTypes.has(type as (typeof allowedBookmarkTypes extends Set<infer T> ? T : never))) {
      return NextResponse.json({ error: "Invalid bookmark type" }, { status: 400 });
    }

    if (!targetId) {
      return NextResponse.json({ error: "targetId is required" }, { status: 400 });
    }

    const collection = getBookmarksCollection(auth.user.uid);
    const existingSnap = await collection
      .where("type", "==", type)
      .where("targetId", "==", targetId)
      .limit(1)
      .get();

    const now = new Date().toISOString();

    if (!existingSnap.empty) {
      const existingRef = existingSnap.docs[0].ref;
      await existingRef.set(
        {
          parentId,
          title,
          notes,
          updatedAt: now,
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        bookmark: {
          id: existingSnap.docs[0].id,
          ...existingSnap.docs[0].data(),
          parentId,
          title,
          notes,
          updatedAt: now,
        },
        created: false,
      });
    }

    const docRef = collection.doc();
    await docRef.set({
      type,
      targetId,
      parentId,
      title,
      notes,
      createdAt: now,
      updatedAt: now,
    });

    await updateUserStats(auth.user.uid, (current) => ({
      bookmarksCount: current.bookmarksCount + 1,
      lastActivityAt: now,
    }));

    return NextResponse.json({
      success: true,
      bookmark: {
        id: docRef.id,
        type,
        targetId,
        parentId,
        title,
        notes,
        createdAt: now,
        updatedAt: now,
      },
      created: true,
    });
  } catch (error) {
    console.error("Bookmark create error:", error);
    return NextResponse.json({ error: "Failed to save bookmark" }, { status: 500 });
  }
}
