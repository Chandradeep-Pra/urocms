import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { publishNotification } from "@/lib/server/notificationService";

type AnnouncementMediaType = "youtube" | "image";
type AnnouncementKind = "general" | "grand-mock";

function extractYoutubeId(input: string): string | null {
  if (!input) return null;

  if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;

  try {
    const url = new URL(input);

    if (url.hostname === "youtu.be") {
      return url.pathname.replace("/", "") || null;
    }

    const vParam = url.searchParams.get("v");
    if (vParam) return vParam;

    if (url.pathname.includes("/embed/")) {
      return url.pathname.split("/embed/")[1] || null;
    }

    if (url.pathname.includes("/shorts/")) {
      return url.pathname.split("/shorts/")[1]?.split(/[/?&]/)[0] || null;
    }

    return null;
  } catch {
    return null;
  }
}

function normalizeString(value: unknown) {
  return String(value ?? "").trim();
}

function normalizeAnnouncementKind(value: unknown): AnnouncementKind {
  return value === "grand-mock" ? "grand-mock" : "general";
}

function formatEndAtForHumans(value: unknown) {
  const raw = normalizeString(value);
  if (!raw) return "";

  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const body = await req.json();
    const title = normalizeString(body.title);
    const subtitle = normalizeString(body.subtitle);
    const description = normalizeString(body.description);
    const mediaType =
      body.mediaType === "youtube" || body.mediaType === "image"
        ? (body.mediaType as AnnouncementMediaType)
        : null;
    const mediaSrc = normalizeString(body.mediaSrc);
    const kind = normalizeAnnouncementKind(body.kind);
    const endsAt = normalizeString(body.endsAt);

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    let media: { type: AnnouncementMediaType; src: string } | null = null;

    if (mediaType === "youtube") {
      if (!mediaSrc) {
        return NextResponse.json({ error: "YouTube link is required" }, { status: 400 });
      }

      const videoId = extractYoutubeId(mediaSrc);
      if (!videoId) {
        return NextResponse.json({ error: "Invalid YouTube URL" }, { status: 400 });
      }

      media = {
        type: "youtube",
        src: videoId,
      };
    }

    if (mediaType === "image") {
      if (!mediaSrc) {
        return NextResponse.json({ error: "Image URL is required" }, { status: 400 });
      }

      media = {
        type: "image",
        src: mediaSrc,
      };
    }

    await adminDb.collection("announcements").doc("live").set({
      title,
      subtitle,
      description,
      kind,
      endsAt: kind === "grand-mock" ? endsAt || null : null,
      media,
      isActive: true,
      createdAt: new Date(),
    });

    const grandMockEndLabel = kind === "grand-mock" ? formatEndAtForHumans(endsAt) : "";

    await publishNotification({
      kind: kind === "grand-mock" ? "grand-mock" : "announcement",
      title: kind === "grand-mock" ? `Grand Mock ${title} is live` : title,
      body:
        kind === "grand-mock"
          ? grandMockEndLabel
            ? `Ends on ${grandMockEndLabel}`
            : "A new grand mock is now live."
          : description || subtitle || "A new announcement has been published.",
      sourceId: "live",
      sourceType: "announcement",
      deepLink: "/announcements",
      audience: "all",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Announcement POST error:", error);
    return NextResponse.json(
      { error: "Failed to save announcement" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const doc = await adminDb.collection("announcements").doc("live").get();

    if (!doc.exists) {
      return NextResponse.json({ announcement: null });
    }

    const data = doc.data() ?? {};

    const kind = data.kind === "grand-mock" ? "grand-mock" : "general";
    const endsAt = data.endsAt ?? null;
    const endLabel = kind === "grand-mock" ? formatEndAtForHumans(endsAt) : "";
    const baseTitle = data.title ?? "";
    const baseSubtitle = data.subtitle ?? "";

    return NextResponse.json({
      announcement: {
        id: doc.id,
        title: kind === "grand-mock" ? `Grand Mock ${baseTitle} is live` : baseTitle,
        subtitle:
          kind === "grand-mock"
            ? endLabel
              ? `Ends on ${endLabel}`
              : baseSubtitle
            : baseSubtitle,
        description: data.description ?? "",
        kind,
        endsAt,
        media: data.media ?? null,
      },
    });
  } catch (error) {
    console.error("Announcement GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcement" },
      { status: 500 }
    );
  }
}
