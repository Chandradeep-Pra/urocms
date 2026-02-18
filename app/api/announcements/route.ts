import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

function extractYoutubeId(input: string): string | null {
  if (!input) return null;

  // Already a video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);

    // youtu.be/<id>
    if (url.hostname === "youtu.be") {
      return url.pathname.replace("/", "");
    }

    // youtube.com/watch?v=<id>
    const vParam = url.searchParams.get("v");
    if (vParam) return vParam;

    // youtube.com/embed/<id>
    if (url.pathname.includes("/embed/")) {
      return url.pathname.split("/embed/")[1];
    }

    return null;
  } catch {
    return null;
  }
}

/* ───────────── CREATE ANNOUNCEMENT ───────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      title,
      subtitle,
      description,
      mediaType,
      mediaSrc,
    } = body;

    if (!title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    let media = undefined;

    if (mediaType === "youtube" && mediaSrc) {
      const videoId = extractYoutubeId(mediaSrc);

      if (!videoId) {
        return NextResponse.json(
          { error: "Invalid YouTube URL" },
          { status: 400 }
        );
      }

      media = {
        type: "youtube",
        src: videoId, // 🔥 CLEAN ID ONLY
      };
    }

    if (mediaType === "image" && mediaSrc) {
      media = {
        type: "image",
        src: mediaSrc,
      };
    }

    await adminDb
      .collection("announcements")
      .doc("live") // single live announcement
      .set({
        title,
        subtitle: subtitle ?? "",
        description: description ?? "",
        media,
        isActive: true,
        createdAt: new Date(),
      });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Announcement POST error:", err);

    return NextResponse.json(
      { error: "Failed to save announcement" },
      { status: 500 }
    );
  }
}

/* ───────────── FETCH ANNOUNCEMENTS ───────────── */
export async function GET() {
  try {
    const doc = await adminDb
      .collection("announcements")
      .doc("live")
      .get();

    if (!doc.exists) {
      return NextResponse.json({ announcement: null });
    }

    const data = doc.data();

    return NextResponse.json({
      announcement: {
        id: doc.id,
        title: data?.title ?? "",
        subtitle: data?.subtitle ?? "",
        description: data?.description ?? "",
        media: data?.media ?? undefined, // ✅ RETURN MEDIA DIRECTLY
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch announcement" },
      { status: 500 }
    );
  }
}


