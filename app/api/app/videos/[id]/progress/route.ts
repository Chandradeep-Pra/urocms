import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import {
  getVideoProgressCollection,
  toPositiveNumber,
  updateUserStats,
} from "@/lib/server/candidateProgress";
import { requireAppUser } from "@/lib/server/appSession";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const { id } = await context.params;
    const body = await req.json();

    const lastPositionSeconds = toPositiveNumber(body?.lastPositionSeconds);
    const watchedSeconds = toPositiveNumber(body?.watchedSeconds, lastPositionSeconds);
    const durationSeconds = toPositiveNumber(body?.durationSeconds);
    const bookmarked = Boolean(body?.bookmarked);

    if (durationSeconds <= 0) {
      return NextResponse.json(
        { error: "durationSeconds must be greater than 0" },
        { status: 400 }
      );
    }

    const videoRef = getAdminDb().collection("videoItems").doc(id);
    const videoDoc = await videoRef.get();

    if (!videoDoc.exists) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    const progressRef = getVideoProgressCollection(auth.user.uid).doc(id);
    const existingDoc = await progressRef.get();
    const existing = existingDoc.exists ? existingDoc.data() ?? {} : {};
    const percentComplete = Number(
      Math.min(100, Math.max(0, (watchedSeconds / durationSeconds) * 100)).toFixed(2)
    );
    const completed = Boolean(body?.completed) || percentComplete >= 90;
    const now = new Date().toISOString();
    const videoData = videoDoc.data() ?? {};

    await progressRef.set(
      {
        videoId: id,
        sectionId: videoData.sectionId ?? null,
        title: String(videoData.title ?? "Untitled Video"),
        durationSeconds,
        watchedSeconds,
        lastPositionSeconds,
        percentComplete,
        completed,
        bookmarked,
        lastWatchedAt: now,
        watchSessionsCount: Math.max(
          1,
          Number(existing.watchSessionsCount ?? 0) + (existingDoc.exists ? 0 : 1)
        ),
        updatedAt: now,
      },
      { merge: true }
    );

    const watchedDeltaMinutes = Math.max(
      0,
      (watchedSeconds - toPositiveNumber(existing.watchedSeconds)) / 60
    );

    await updateUserStats(auth.user.uid, (current) => ({
      videosStarted: current.videosStarted + (existingDoc.exists ? 0 : 1),
      videosCompleted:
        current.videosCompleted +
        (!existing.completed && completed ? 1 : 0),
      totalWatchMinutes: Number(
        Math.max(0, current.totalWatchMinutes + watchedDeltaMinutes).toFixed(2)
      ),
      lastActivityAt: now,
    }));

    return NextResponse.json({
      success: true,
      progress: {
        videoId: id,
        watchedSeconds,
        lastPositionSeconds,
        durationSeconds,
        percentComplete,
        completed,
        bookmarked,
        lastWatchedAt: now,
      },
    });
  } catch (error) {
    console.error("Video progress save error:", error);
    return NextResponse.json({ error: "Failed to save video progress" }, { status: 500 });
  }
}
