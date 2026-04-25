import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("mocks")
      .orderBy("createdAt", "desc")
      .get();

    const mocks = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        attemptsCount: Array.isArray(data.attempts)
          ? data.attempts.length
          : data.attemptsCount ?? 0,
        ...data,
      };
    });

    return NextResponse.json({ mocks });
  } catch (err) {
    console.error("Fetch mocks error:", err);

    return NextResponse.json(
      { error: "Failed to fetch mocks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quizId, startTime, endTime, durationMinutes } = body;

    if (!quizId || !startTime) {
      return NextResponse.json(
        { error: "Quiz and start time required" },
        { status: 400 }
      );
    }

    const quizDoc = await adminDb.collection("quizzes").doc(quizId).get();

    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    const quizData = quizDoc.data();

    if (quizData?.type !== "mock" && quizData?.type !== "grand-mock") {
      return NextResponse.json(
        { error: "Only mock type quizzes can be scheduled" },
        { status: 400 }
      );
    }

    const finalDuration =
      durationMinutes && durationMinutes > 0
        ? Number(durationMinutes)
        : quizData?.durationMinutes || 60;

    const resolvedStartTime = new Date(startTime);
    const resolvedEndTime = endTime
      ? new Date(endTime)
      : new Date(resolvedStartTime.getTime() + finalDuration * 60 * 1000);

    const docRef = await adminDb.collection("mocks").add({
      quizId,
      title: quizData?.title || "Untitled Mock",
      type: quizData?.type,
      startTime: resolvedStartTime,
      endTime: resolvedEndTime,
      durationMinutes: finalDuration,
      attempts: [],
      attemptsCount: 0,
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
    });
  } catch (err) {
    console.error("Create mock error:", err);

    return NextResponse.json(
      { error: "Failed to create mock" },
      { status: 500 }
    );
  }
}
