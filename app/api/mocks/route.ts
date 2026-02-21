import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

/* ─────────────────────────────────────────────
   GET — Fetch All Scheduled Mocks
───────────────────────────────────────────── */

export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("mocks")
      .orderBy("createdAt", "desc")
      .get();

    const mocks = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ mocks });

  } catch (err) {
    console.error("Fetch mocks error:", err);

    return NextResponse.json(
      { error: "Failed to fetch mocks" },
      { status: 500 }
    );
  }
}

/* ─────────────────────────────────────────────
   POST — Create Mock Event
───────────────────────────────────────────── */

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { quizId, startTime, durationMinutes } = body;

    if (!quizId || !startTime) {
      return NextResponse.json(
        { error: "Quiz and start time required" },
        { status: 400 }
      );
    }

    /* ───────── Fetch Quiz To Validate ───────── */

    const quizDoc = await adminDb
      .collection("quizzes")
      .doc(quizId)
      .get();

    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    const quizData = quizDoc.data();

    /* ───────── Validate Type ───────── */

    if (
      quizData?.type !== "mock" &&
      quizData?.type !== "grand-mock"
    ) {
      return NextResponse.json(
        { error: "Only mock type quizzes can be scheduled" },
        { status: 400 }
      );
    }

    /* ───────── Final Duration Logic ───────── */

    const finalDuration =
      durationMinutes && durationMinutes > 0
        ? durationMinutes
        : quizData?.durationMinutes || 60;

    /* ───────── Create Mock Event ───────── */

    const docRef = await adminDb
      .collection("mocks")
      .add({
        quizId,
        title: quizData?.title || "Untitled Mock",
        type: quizData?.type,
        startTime: new Date(startTime),
        durationMinutes: finalDuration,
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