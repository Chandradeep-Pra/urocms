import { adminDb } from "@/lib/firebaseAdmin";

export async function getQuestionsForQuiz(quizData: any) {
  let questions: any[] = [];

  if (Array.isArray(quizData?.questionIds) && quizData.questionIds.length > 0) {
    const snapshots = await Promise.all(
      quizData.questionIds.map((questionId: string) =>
        adminDb.collection("questions").doc(questionId).get()
      )
    );

    questions = snapshots
      .filter((doc) => doc.exists)
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
  } else if (Array.isArray(quizData?.bankIds) && quizData.bankIds.length > 0) {
    for (const bankId of quizData.bankIds) {
      const questionSnapshot = await adminDb
        .collection("questions")
        .where("bankId", "==", bankId)
        .where("isActive", "==", true)
        .get();

      questionSnapshot.forEach((doc) => {
        questions.push({
          id: doc.id,
          ...doc.data(),
        });
      });
    }
  }

  return questions;
}

export function formatQuestionsForApp(questions: any[]) {
  const optionLabels = ["A", "B", "C", "D"];

  return questions.map((question, index) => ({
    id: question.id ?? null,
    question_number: index + 1,
    question: question.questionText ?? "",
    options: Array.isArray(question.options) ? question.options : [],
    correct_answer:
      typeof question.correctAnswer === "number"
        ? optionLabels[question.correctAnswer] ?? null
        : null,
    image: question.questionImage || null,
    solution: question.explanation
      ? [
          {
            image: question.explanation.image || null,
            explanation: question.explanation.text || "",
          },
        ]
      : [],
  }));
}
