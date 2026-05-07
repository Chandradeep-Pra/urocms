import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const quizRef = adminDb.collection("dailyQuizzes").doc(id);
    const quizSnap = await quizRef.get();

    if (!quizSnap.exists) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const attemptsSnap = await quizRef.collection("attempts").orderBy("createdAt", "desc").get();
    const attemptsRaw = attemptsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const userIds = Array.from(
      new Set(
        attemptsRaw
          .map((attempt) => String(attempt.uid || "").trim())
          .filter(Boolean)
      )
    );

    const users = await Promise.all(
      userIds.map(async (uid) => {
        const userDoc = await adminDb.collection("users").doc(uid).get();
        return {
          uid,
          email: userDoc.exists ? userDoc.data()?.email || "" : "",
        };
      })
    );

    const emailByUid = new Map(users.map((user) => [user.uid, user.email]));

    const attempts = attemptsRaw.map((attempt) => ({
      uid: attempt.uid || "",
      email: emailByUid.get(String(attempt.uid || "")) || "",
      selectedIndex: attempt.selectedIndex ?? null,
      correct: Boolean(attempt.correct),
      createdAt: attempt.createdAt ?? null,
    }));

    return NextResponse.json({
      quiz: {
        id: quizSnap.id,
        ...quizSnap.data(),
      },
      attempts,
    });
  } catch (error) {
    console.error("Daily quiz detail fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz details" },
      { status: 500 }
    );
  }
}
