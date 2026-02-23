//ts-nocheck

import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

/* ---------------------------------- */
/* UPDATE QUIZ */
/* ---------------------------------- */

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ verificationId: string }> }
) {
  try {
    const { verificationId } = await context.params;
    const body = await req.json();

    const docRef = adminDb
      .collection("quizzes")
      .doc(verificationId);

    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    await docRef.update({
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Update quiz error:", err);
    return NextResponse.json(
      { error: "Failed to update quiz" },
      { status: 500 }
    );
  }
}

/* ---------------------------------- */
/* SOFT DELETE QUIZ */
/* ---------------------------------- */

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ verificationId: string }> }
) {
  try {
    const { verificationId } = await context.params;

    const docRef = adminDb
      .collection("quizzes")
      .doc(verificationId);

    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    await docRef.update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Delete quiz error:", err);
    return NextResponse.json(
      { error: "Failed to delete quiz" },
      { status: 500 }
    );
  }
}

/* ---------------------------------- */
/* GET QUIZ BY VERIFICATION ID */
/* ---------------------------------- */

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const verificationId = id;

    console.log("Fetching quiz:", verificationId);

    const doc = await adminDb
      .collection("quizzes")
      .doc(verificationId)
      .get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Quiz not found" },
        { status: 404 }
      );
    }

    const quizData = doc.data();
    console.log("Quiz data:", quizData);

    /* ------------------------------------ */
    /* 🔥 Fetch & Format Questions */
    /* ------------------------------------ */

    const questions: any[] = [];

if (quizData?.bankIds?.length) {
  for (const bankId of quizData.bankIds) {
    const questionSnapshot = await adminDb
      .collection("questions")
      .where("bankId", "==", bankId)
      .get();

    questionSnapshot.forEach((doc) => {
      questions.push(doc.data());
    });
  }
}

// 🔥 Format exactly for RN
const optionLabels = ["A", "B", "C", "D"];

const formattedQuestions = questions.map((q, index) => ({
  question_number: index + 1,
  question: q.questionText, // 🔥 correct field
  options: q.options,
  correct_answer: optionLabels[q.correctAnswer], // 🔥 convert index → A/B/C/D
  image: q.questionImage || null,
  solution: q.explanation
  ? [
      {
        image: q.explanation.image || null,
        explanation: q.explanation.text || "",
      },
    ]
  : [],

}));
    console.log("Formatted questions:", formattedQuestions);
    /* ------------------------------------ */

    return NextResponse.json({
      quiz: {
        id: doc.id,
        ...quizData,
        questions: formattedQuestions, // 🔥 Added
      },
    });

  } catch (err) {
    console.error("Quiz fetch error:", err);

    return NextResponse.json(
      { error: "Failed to load quiz" },
      { status: 500 }
    );
  }
}

