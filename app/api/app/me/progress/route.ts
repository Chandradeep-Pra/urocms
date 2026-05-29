import { NextRequest, NextResponse } from "next/server";
import {
  defaultUserStats,
  getMockAttemptsCollection,
  getQuizAttemptsCollection,
  getVideoProgressCollection,
  getVivaAttemptsCollection,
  getUserStatsRef,
} from "@/lib/server/candidateProgress";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const [statsDoc, continueWatchingSnap, recentQuizzesSnap, recentMocksSnap, recentVivaSnap] =
      await Promise.all([
        getUserStatsRef(auth.user.uid).get(),
        getVideoProgressCollection(auth.user.uid)
          .where("completed", "==", false)
          .orderBy("lastWatchedAt", "desc")
          .limit(5)
          .get(),
        getQuizAttemptsCollection(auth.user.uid)
          .orderBy("submittedAt", "desc")
          .limit(5)
          .get(),
        getMockAttemptsCollection(auth.user.uid)
          .orderBy("submittedAt", "desc")
          .limit(5)
          .get(),
        getVivaAttemptsCollection(auth.user.uid)
          .orderBy("submittedAt", "desc")
          .limit(5)
          .get(),
      ]);

    const stats = statsDoc.exists
      ? {
          ...defaultUserStats(),
          ...(statsDoc.data() ?? {}),
        }
      : defaultUserStats();

    const continueWatching = continueWatchingSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const recentQuizzes = recentQuizzesSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const recentMocks = recentMocksSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const recentVivaAttempts = recentVivaSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      stats,
      continueWatching,
      recentQuizzes,
      recentMocks,
      recentVivaAttempts,
      summary: {
        continueWatchingCount: continueWatching.length,
        recentQuizCount: recentQuizzes.length,
        recentMockCount: recentMocks.length,
        recentVivaCount: recentVivaAttempts.length,
      },
    });
  } catch (error) {
    console.error("Candidate progress summary error:", error);
    return NextResponse.json({ error: "Failed to load progress" }, { status: 500 });
  }
}
