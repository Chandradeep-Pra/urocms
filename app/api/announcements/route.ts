import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { publishNotification } from "@/lib/server/notificationService";

type AnnouncementMediaType = "youtube" | "image";
type AnnouncementKind = "general" | "grand-mock";
const MAX_ACTIVE_ANNOUNCEMENTS = 6;

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

function serializeAnnouncement(id: string, data: Record<string, any>) {
  const kind = data.kind === "grand-mock" ? "grand-mock" : "general";
  const endsAt = data.endsAt ?? null;
  const endLabel = kind === "grand-mock" ? formatEndAtForHumans(endsAt) : "";
  const baseTitle = data.title ?? "";
  const baseSubtitle = data.subtitle ?? "";

  return {
    id,
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
    createdAt: data.createdAt ?? null,
  };
}

function getCreatedAtMs(data: Record<string, any>) {
  const value = data.createdAt;

  if (value?.toMillis) return value.toMillis();
  if (value instanceof Date) return value.getTime();

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
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

    const activeSnapshot = await adminDb
      .collection("announcements")
      .where("isActive", "==", true)
      .get();

    if (activeSnapshot.size >= MAX_ACTIVE_ANNOUNCEMENTS) {
      return NextResponse.json(
        { error: "You can publish at most 6 active announcements at once." },
        { status: 400 }
      );
    }

    const announcementRef = adminDb.collection("announcements").doc();

    await announcementRef.set({
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
      sourceId: announcementRef.id,
      sourceType: "announcement",
      deepLink: "/announcements",
      audience: "all",
    });

    return NextResponse.json({ success: true, id: announcementRef.id });
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
    const snapshot = await adminDb
      .collection("announcements")
      .where("isActive", "==", true)
      .get();

    const announcements = snapshot.docs
      .map((doc) => ({ id: doc.id, data: doc.data() ?? {} }))
      .sort((a, b) => getCreatedAtMs(b.data) - getCreatedAtMs(a.data))
      .slice(0, MAX_ACTIVE_ANNOUNCEMENTS)
      .map((item) => serializeAnnouncement(item.id, item.data));

    return NextResponse.json({
      announcement: announcements[0] ?? null,
      announcements,
    });
  } catch (error) {
    console.error("Announcement GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch announcement" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { searchParams } = new URL(req.url);
    const id = normalizeString(searchParams.get("id"));

    if (!id) {
      return NextResponse.json({ error: "Announcement id is required" }, { status: 400 });
    }

    await adminDb.collection("announcements").doc(id).update({
      isActive: false,
      archivedAt: new Date(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Announcement DELETE error:", error);
    return NextResponse.json(
      { error: "Failed to unpublish announcement" },
      { status: 500 }
    );
  }
}
