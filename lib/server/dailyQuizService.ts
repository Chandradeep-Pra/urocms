import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { geminiModel } from "@/lib/gemini";

type DailyQuizInput = {
  question?: unknown;
  image?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
};

function getTodayQuizId() {
  return new Date().toISOString().split("T")[0];
}

function normalizeDailyQuizPayload(input: DailyQuizInput) {
  return {
    question: String(input.question || "").trim(),
    image: String(input.image || "").trim(),
    options: Array.isArray(input.options)
      ? input.options.map((option) => String(option || "").trim())
      : [],
    correctIndex:
      typeof input.correctIndex === "number"
        ? input.correctIndex
        : Number(input.correctIndex),
    explanation: String(input.explanation || "").trim(),
  };
}

function validateDailyQuizPayload(payload: ReturnType<typeof normalizeDailyQuizPayload>) {
  if (
    !payload.question ||
    payload.options.length !== 5 ||
    !Number.isInteger(payload.correctIndex)
  ) {
    throw new Error("Invalid quiz payload");
  }
}

export function getDailyQuizNoStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  };
}

export async function saveTodayDailyQuiz(input: DailyQuizInput) {
  const payload = normalizeDailyQuizPayload(input);
  validateDailyQuizPayload(payload);

  await adminDb.collection("dailyQuizzes").doc(getTodayQuizId()).set({
    question: payload.question,
    image: payload.image,
    options: payload.options,
    correctIndex: payload.correctIndex,
    explanation: payload.explanation,
    submissions: 0,
    createdAt: FieldValue.serverTimestamp(),
    source: "manual",
  });

  return { success: true };
}

export async function getLiveDailyQuiz() {
  const doc = await adminDb.collection("dailyQuizzes").doc(getTodayQuizId()).get();
  if (!doc.exists) {
    return null;
  }

  return {
    id: doc.id,
    ...doc.data(),
  };
}

export async function listDailyQuizHistory() {
  const snapshot = await adminDb.collection("dailyQuizzes").get();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .sort((a: any, b: any) => {
      const aId = String(a.id || "");
      const bId = String(b.id || "");

      if (/^\d{4}-\d{2}-\d{2}$/.test(aId) && /^\d{4}-\d{2}-\d{2}$/.test(bId)) {
        return bId.localeCompare(aId);
      }

      const aCreatedAt =
        typeof a.createdAt === "object" && a.createdAt?._seconds
          ? a.createdAt._seconds * 1000
          : new Date(a.createdAt || 0).getTime();
      const bCreatedAt =
        typeof b.createdAt === "object" && b.createdAt?._seconds
          ? b.createdAt._seconds * 1000
          : new Date(b.createdAt || 0).getTime();

      return bCreatedAt - aCreatedAt;
    });
}

export async function getDailyQuizDetails(id: string) {
  const quizRef = adminDb.collection("dailyQuizzes").doc(id);
  const quizSnap = await quizRef.get();

  if (!quizSnap.exists) {
    throw new Error("Quiz not found");
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

  return {
    quiz: {
      id: quizSnap.id,
      ...quizSnap.data(),
    },
    attempts,
  };
}

export async function generateDailyQuizFromTopic(topic: unknown) {
  const normalizedTopic = String(topic || "").trim();
  if (!normalizedTopic) {
    throw new Error("Topic required");
  }

  const prompt = `
You are a senior FRCS Urology examiner.

Generate ONE high-quality multiple choice question for "Quiz of the Day".

Topic: ${normalizedTopic}

Requirements:
 - Clinical scenario based
 - 5 options only
 - One correct answer
- Clear educational explanation
- High-yield learning value

Return STRICT JSON only (no markdown, no commentary):

{
  "question": "string",
  "options": ["string", "string", "string", "string", "string"],
  "correctIndex": number (0-4),
  "explanation": "string"
}
`;

  const result = await geminiModel.generateContent(prompt);
  const raw = result.response.text();
  const cleaned = raw.replace(/```json|```/g, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error("AI returned invalid format");
  }

  if (!parsed.question || !Array.isArray(parsed.options) || parsed.options.length !== 5) {
    throw new Error("Invalid AI structure");
  }

  return {
    question: parsed.question,
    image: "",
    options: parsed.options,
    correctIndex: parsed.correctIndex ?? 0,
    explanation: parsed.explanation ?? "",
  };
}

export async function submitTodayDailyQuizAttempt(params: {
  uid: string;
  selectedIndex: unknown;
}) {
  if (params.selectedIndex === undefined) {
    throw new Error("Invalid submission");
  }

  const quizRef = adminDb.collection("dailyQuizzes").doc(getTodayQuizId());
  const attemptRef = quizRef.collection("attempts").doc(params.uid);
  const quizSnap = await quizRef.get();

  if (!quizSnap.exists) {
    throw new Error("Quiz not found");
  }

  const quizData = quizSnap.data() ?? {};
  const existingAttempt = await attemptRef.get();
  if (existingAttempt.exists) {
    throw new Error("Already submitted");
  }

  const correct = params.selectedIndex === quizData.correctIndex;

  await adminDb.runTransaction(async (transaction) => {
    transaction.set(attemptRef, {
      uid: params.uid,
      selectedIndex: params.selectedIndex,
      correct,
      createdAt: new Date(),
    });

    transaction.update(quizRef, {
      submissions: (quizData.submissions ?? 0) + 1,
    });
  });

  return { correct };
}
