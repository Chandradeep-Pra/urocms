import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);

    const uid = decoded.uid;

    const { selectedIndex } = await req.json();

    if (selectedIndex === undefined) {
      return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
    }

    const today = new Date().toISOString().split("T")[0];
    const quizRef = adminDb.collection("dailyQuizzes").doc(today);
    const attemptRef = quizRef.collection("attempts").doc(uid);

    const quizSnap = await quizRef.get();

    if (!quizSnap.exists) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const quizData = quizSnap.data();
    const correctIndex = quizData?.correctIndex;

    // 🔐 Prevent duplicate attempt
    const existingAttempt = await attemptRef.get();
    if (existingAttempt.exists) {
      return NextResponse.json({ error: "Already submitted" }, { status: 400 });
    }

    const correct = selectedIndex === correctIndex;

    // 🔥 Use transaction for safe increment
    await adminDb.runTransaction(async (transaction) => {
      transaction.set(attemptRef, {
        uid,
        selectedIndex,
        correct,
        createdAt: new Date(),
      });

      transaction.update(quizRef, {
        submissions: (quizData?.submissions ?? 0) + 1,
      });
    });

    return NextResponse.json({
      correct,
    });

  } catch (err) {
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
