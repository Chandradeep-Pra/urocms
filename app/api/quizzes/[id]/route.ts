import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";

type QuizRouteContext = {
  params: Promise<{ id: string }>;
};

function mapQuestionForAdmin(data: any, index: number) {
  const optionLabels = ["A", "B", "C", "D", "E"];

  return {
    id: data.id ?? `${index + 1}`,
    question_number: index + 1,
    question: data.questionText ?? "",
    options: Array.isArray(data.options) ? data.options : [],
    correct_answer:
      typeof data.correctAnswer === "number"
        ? optionLabels[data.correctAnswer] ?? null
        : null,
    image: data.questionImage || null,
    solution: data.explanation
      ? [
          {
            image: data.explanation.image || null,
            explanation: data.explanation.text || "",
          },
        ]
      : [],
  };
}

export async function PUT(req: NextRequest, context: QuizRouteContext) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const docRef = adminDb.collection("quizzes").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    await docRef.update({
      ...body,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Update quiz error:", error);
    return NextResponse.json({ error: "Failed to update quiz" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, context: QuizRouteContext) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    const docRef = adminDb.collection("quizzes").doc(id);
    const doc = await docRef.get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    await docRef.update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete quiz error:", error);
    return NextResponse.json({ error: "Failed to delete quiz" }, { status: 500 });
  }
}

export async function GET(req: NextRequest, context: QuizRouteContext) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    const doc = await adminDb.collection("quizzes").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const quizData = doc.data() ?? {};
    const questions: any[] = [];

    if (Array.isArray(quizData.bankIds)) {
      for (const bankId of quizData.bankIds) {
        const questionSnapshot = await adminDb
          .collection("questions")
          .where("bankId", "==", bankId)
          .get();

        questionSnapshot.forEach((questionDoc) => {
          questions.push({
            id: questionDoc.id,
            ...questionDoc.data(),
          });
        });
      }
    }

    return NextResponse.json({
      quiz: {
        id: doc.id,
        ...quizData,
        questions: questions.map(mapQuestionForAdmin),
      },
    });
  } catch (error) {
    console.error("Quiz fetch error:", error);
    return NextResponse.json({ error: "Failed to load quiz" }, { status: 500 });
  }
}
