import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  averageWithNext,
  getMockAttemptsCollection,
  toPercent,
  toPositiveNumber,
  updateUserStats,
} from "@/lib/server/candidateProgress";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  if (auth.user.tier !== "paid") {
    return tierLockedResponse({
      feature: "mocks",
      tier: auth.user.tier,
      requiredTier: "paid",
      reason: "Submitting hosted mock attempts is available only for paid users.",
    });
  }

  try {
    const { id } = await context.params;
    const body = await req.json();
    const marks = body?.marks;
    const correctCount = toPositiveNumber(body?.correctCount);
    const totalQuestions = toPositiveNumber(body?.totalQuestions);
    const timeTakenSeconds = toPositiveNumber(body?.timeTakenSeconds);

    if (marks === undefined || marks === null) {
      return NextResponse.json({ error: "Marks are required" }, { status: 400 });
    }

    const mockRef = adminDb.collection("mocks").doc(id);
    const mockDoc = await mockRef.get();

    if (!mockDoc.exists) {
      return NextResponse.json({ error: "Mock not found" }, { status: 404 });
    }

    const mockData = mockDoc.data();
    const existingAttempts = Array.isArray(mockData?.attempts) ? mockData.attempts : [];
    const normalizedMarks = typeof marks === "number" ? marks : Number(marks);

    if (Number.isNaN(normalizedMarks)) {
      return NextResponse.json({ error: "Invalid marks" }, { status: 400 });
    }

    const attemptType =
      mockData?.type === "grand-mock" ? "grand-mock" : "mock";
    const percent =
      totalQuestions > 0 ? toPercent(correctCount || normalizedMarks, totalQuestions) : null;
    const createdAt = new Date().toISOString();

    const nextAttempt = {
      candidate: {
        uid: auth.user.uid,
        name: auth.user.name || "Paid User",
        email: auth.user.email || "",
      },
      marks: normalizedMarks,
      createdAt,
    };

    const attempts = [...existingAttempts, nextAttempt];

    const userAttemptRef = getMockAttemptsCollection(auth.user.uid).doc();

    await Promise.all([
      mockRef.update({
        attempts,
        attemptsCount: attempts.length,
        updatedAt: FieldValue.serverTimestamp(),
      }),
      userAttemptRef.set({
        mockId: id,
        quizId: mockData?.quizId ?? null,
        type: attemptType,
        score: normalizedMarks,
        correctCount: correctCount || null,
        totalQuestions: totalQuestions || null,
        percent,
        timeTakenSeconds: timeTakenSeconds || null,
        submittedAt: createdAt,
      }),
      updateUserStats(auth.user.uid, (current) => {
        const attemptCountBase = current.mocksAttempted + current.grandMocksAttempted;
        return {
          mocksAttempted:
            current.mocksAttempted + (attemptType === "mock" ? 1 : 0),
          grandMocksAttempted:
            current.grandMocksAttempted + (attemptType === "grand-mock" ? 1 : 0),
          averageMockScore: averageWithNext(
            current.averageMockScore,
            attemptCountBase,
            normalizedMarks
          ),
          bestMockScore: Math.max(current.bestMockScore, normalizedMarks),
          lastActivityAt: createdAt,
        };
      }),
    ]);

    return NextResponse.json({
      success: true,
      attemptsCount: attempts.length,
      attempt: nextAttempt,
    });
  } catch (error) {
    console.error("App mock attempt submit error:", error);
    return NextResponse.json({ error: "Failed to submit mock attempt" }, { status: 500 });
  }
}
