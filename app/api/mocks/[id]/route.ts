import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";


/* ───────── GET SINGLE MOCK ───────── */

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    /* 1️⃣ Fetch Mock */
    const mockDoc = await adminDb
      .collection("mocks")
      .doc(id)
      .get();

    if (!mockDoc.exists) {
      return NextResponse.json(
        { error: "Mock not found" },
        { status: 404 }
      );
    }

    const mockData = mockDoc.data();

    /* 2️⃣ Fetch Quiz via quizId */
    const quizDoc = await adminDb
      .collection("quizzes")
      .doc(mockData.quizId) // 🔥 THIS IS THE KEY
      .get();

    if (!quizDoc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    const quizData = quizDoc.data();

    /* 3️⃣ Fetch Questions */

    let questions: any[] = [];

    // If explicit questionIds exist (mini mock case)
    if (quizData.questionIds?.length) {
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
    }

    // Else fetch via bankIds (full bank case)
    else if (quizData.bankIds?.length) {
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
        startTime:
          mockData.startTime?.toDate()?.toISOString(),
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

/* ───────── UPDATE MOCK ───────── */

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    await adminDb.collection("mocks").doc(id).update({
      ...body,
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

/* ───────── DELETE MOCK ───────── */

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