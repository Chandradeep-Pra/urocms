import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const mockDoc = await adminDb.collection("mocks").doc(id).get();

    if (!mockDoc.exists) {
      return NextResponse.json(
        { error: "Mock not found" },
        { status: 404 }
      );
    }

    const mockData = mockDoc.data();
    const quizDoc = await adminDb.collection("quizzes").doc(mockData?.quizId).get();

    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    const quizData = quizDoc.data();
    let questions: any[] = [];

    if (quizData?.questionIds?.length) {
      const snapshots = await Promise.all(
        quizData.questionIds.map((qid: string) =>
          adminDb.collection("questions").doc(qid).get()
        )
      );

      questions = snapshots
        .filter((doc) => doc.exists)
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
    } else if (quizData?.bankIds?.length) {
      const snapshot = await adminDb
        .collection("questions")
        .where("bankId", "in", quizData.bankIds)
        .where("isActive", "==", true)
        .get();

      questions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    return NextResponse.json({
      mock: {
        id: mockDoc.id,
        ...mockData,
        startTime: mockData?.startTime?.toDate?.()?.toISOString?.() ?? mockData?.startTime ?? null,
        endTime: mockData?.endTime?.toDate?.()?.toISOString?.() ?? mockData?.endTime ?? null,
        attempts: Array.isArray(mockData?.attempts) ? mockData.attempts : [],
        attemptsCount: Array.isArray(mockData?.attempts)
          ? mockData.attempts.length
          : mockData?.attemptsCount ?? 0,
        quiz: {
          id: quizDoc.id,
          ...quizData,
        },
        questions,
      },
    });
  } catch (err) {
    console.error("Mock fetch error:", err);
    return NextResponse.json(
      { error: "Failed to load mock" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { quizId, startTime, endTime, durationMinutes, attempts } = body;

    const existingMockDoc = await adminDb.collection("mocks").doc(id).get();

    if (!existingMockDoc.exists) {
      return NextResponse.json(
        { error: "Mock not found" },
        { status: 404 }
      );
    }

    const existingMock = existingMockDoc.data();
    const nextQuizId = quizId || existingMock?.quizId;
    const quizDoc = await adminDb.collection("quizzes").doc(nextQuizId).get();

    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    const quizData = quizDoc.data();

    if (quizData?.type !== "mock" && quizData?.type !== "grand-mock") {
      return NextResponse.json(
        { error: "Only mock type quizzes can be linked" },
        { status: 400 }
      );
    }

    const normalizedAttempts = Array.isArray(attempts)
      ? attempts.map((attempt) => ({
          candidate: {
            name: attempt?.candidate?.name || "",
            email: attempt?.candidate?.email || "",
          },
          marks:
            typeof attempt?.marks === "number"
              ? attempt.marks
              : Number(attempt?.marks || 0),
        }))
      : Array.isArray(existingMock?.attempts)
      ? existingMock.attempts
      : [];

    const resolvedDuration =
      durationMinutes && Number(durationMinutes) > 0
        ? Number(durationMinutes)
        : existingMock?.durationMinutes || quizData?.durationMinutes || 60;

    const resolvedStartTime = startTime
      ? new Date(startTime)
      : existingMock?.startTime?.toDate?.() || existingMock?.startTime || null;

    const resolvedEndTime = endTime
      ? new Date(endTime)
      : resolvedStartTime
      ? new Date(new Date(resolvedStartTime).getTime() + resolvedDuration * 60 * 1000)
      : existingMock?.endTime?.toDate?.() || existingMock?.endTime || null;

    await adminDb.collection("mocks").doc(id).update({
      quizId: nextQuizId,
      title: quizData?.title || existingMock?.title || "Untitled Mock",
      type: quizData?.type || existingMock?.type || "mock",
      startTime: resolvedStartTime,
      endTime: resolvedEndTime,
      durationMinutes: resolvedDuration,
      attempts: normalizedAttempts,
      attemptsCount: normalizedAttempts.length,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update mock error:", err);
    return NextResponse.json(
      { error: "Failed to update mock" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await adminDb.collection("mocks").doc(id).delete();

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Delete mock error:", err);
    return NextResponse.json(
      { error: "Failed to delete mock" },
      { status: 500 }
    );
  }
}
