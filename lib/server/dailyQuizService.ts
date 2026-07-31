import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { geminiModel } from "@/lib/gemini";
import { publishNotification } from "@/lib/server/notificationService";

type DailyQuizInput = {
  question?: unknown;
  image?: unknown;
  options?: unknown;
  correctIndex?: unknown;
  explanation?: unknown;
};

type DailyQuizTopicPick = {
  topic: string;
  examTrack: "FRCS" | "FEBU";
};

const LIVE_POINTER_DOC = adminDb.collection("systemState").doc("dailyQuizLive");

function createDailyQuizId() {
  return `daily-quiz-${Date.now()}`;
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

function isQuizExpired(expiresAt?: { _seconds?: number; toDate?: () => Date } | string | Date | null) {
  if (!expiresAt) return false;

  let date: Date;
  if (expiresAt instanceof Date) {
    date = expiresAt;
  } else if (typeof expiresAt === "string") {
    date = new Date(expiresAt);
  } else if (typeof expiresAt.toDate === "function") {
    date = expiresAt.toDate();
  } else {
    date = new Date((expiresAt._seconds || 0) * 1000);
  }

  return Number.isFinite(date.getTime()) && date.getTime() <= Date.now();
}

async function getCurrentLiveQuizDoc() {
  const pointerSnap = await LIVE_POINTER_DOC.get();
  const activeQuizId = String(pointerSnap.data()?.activeQuizId || "").trim();

  if (activeQuizId) {
    const quizSnap = await adminDb.collection("dailyQuizzes").doc(activeQuizId).get();
    if (quizSnap.exists) {
      return {
        id: quizSnap.id,
        ...quizSnap.data(),
      } as Record<string, any>;
    }
  }

  const liveSnapshot = await adminDb
    .collection("dailyQuizzes")
    .where("isLive", "==", true)
    .orderBy("createdAt", "desc")
    .limit(1)
    .get();

  if (liveSnapshot.empty) {
    return null;
  }

  const doc = liveSnapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data(),
  } as Record<string, any>;
}

async function markPreviousLiveQuizInactive(previousId?: string | null) {
  if (!previousId) return;

  await adminDb.collection("dailyQuizzes").doc(previousId).set(
    {
      isLive: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

async function createAndActivateDailyQuiz(params: {
  quiz: ReturnType<typeof normalizeDailyQuizPayload>;
  source: "manual" | "auto";
  topic?: string;
  examTrack?: "FRCS" | "FEBU";
}) {
  const docRef = adminDb.collection("dailyQuizzes").doc(createDailyQuizId());
  const previousLive = await getCurrentLiveQuizDoc();

  await markPreviousLiveQuizInactive(previousLive?.id);

  await docRef.set({
    question: params.quiz.question,
    image: params.quiz.image,
    options: params.quiz.options,
    correctIndex: params.quiz.correctIndex,
    explanation: params.quiz.explanation,
    submissions: 0,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    source: params.source,
    topic: params.topic || "",
    examTrack: params.examTrack || "",
    isLive: true,
  });

  await LIVE_POINTER_DOC.set(
    {
      activeQuizId: docRef.id,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    id: docRef.id,
    ...params.quiz,
    submissions: 0,
    source: params.source,
    topic: params.topic || "",
    examTrack: params.examTrack || "",
    isLive: true,
  };
}

async function getRecentTopicHistory(limit = 12) {
  const snapshot = await adminDb
    .collection("dailyQuizzes")
    .orderBy("createdAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs
    .map((doc) => ({
      topic: String(doc.data().topic || "").trim(),
      examTrack: String(doc.data().examTrack || "").trim(),
    }))
    .filter((item) => item.topic);
}

export async function pickUrologicsDailyQuizTopic(): Promise<DailyQuizTopicPick> {
  const recentTopics = await getRecentTopicHistory();
  const prompt = `
You are planning the next Urologics Quiz of the Day for FRCS / FEBU urology preparation.

Choose ONE high-yield urology topic for a daily quiz.

Rules:
- Pick either FRCS or FEBU as the exam track
- Topic must be clearly related to urology
- Prefer clinically useful and exam-relevant topics
- Avoid repeating recent topics if possible
- Return STRICT JSON only

Recent topics to avoid if possible:
${recentTopics.map((item) => `- ${item.examTrack}: ${item.topic}`).join("\n") || "- none"}

Return:
{
  "examTrack": "FRCS" or "FEBU",
  "topic": "topic string"
}
`;

  const result = await geminiModel.generateContent(prompt);
  const raw = result.response.text().replace(/```json|```/g, "").trim();

  let parsed: any;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("AI returned invalid topic format");
  }

  const examTrack = parsed?.examTrack === "FEBU" ? "FEBU" : "FRCS";
  const topic = String(parsed?.topic || "").trim();

  if (!topic) {
    throw new Error("AI did not return a valid topic");
  }

  return {
    topic,
    examTrack,
  };
}

export function getDailyQuizNoStoreHeaders() {
  return {
    "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  };
}

export async function saveTodayDailyQuiz(input: DailyQuizInput) {
  const payload = normalizeDailyQuizPayload(input);
  validateDailyQuizPayload(payload);

  await createAndActivateDailyQuiz({
    quiz: payload,
    source: "manual",
  });

  return { success: true };
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
  "correctIndex": number,
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

export async function ensureLiveDailyQuiz() {
  const currentLive = await getCurrentLiveQuizDoc();

  if (currentLive && !isQuizExpired(currentLive.expiresAt)) {
    return {
      quiz: currentLive,
      autoCreated: false,
    };
  }

  if (currentLive?.id) {
    await markPreviousLiveQuizInactive(currentLive.id);
  }

  const topicPick = await pickUrologicsDailyQuizTopic();
  const generatedQuiz = normalizeDailyQuizPayload(
    await generateDailyQuizFromTopic(`${topicPick.examTrack} Urology - ${topicPick.topic}`)
  );
  validateDailyQuizPayload(generatedQuiz);

  const quiz = await createAndActivateDailyQuiz({
    quiz: generatedQuiz,
    source: "auto",
    topic: topicPick.topic,
    examTrack: topicPick.examTrack,
  });

  await publishNotification({
    kind: "daily-quiz",
    title: "New Daily Quiz Posted",
    body: String(quiz.question || "Today's daily quiz is now live.").trim(),
    sourceType: "dailyQuiz",
    deepLink: "/daily-quiz",
    audience: "all",
  });

  return {
    quiz,
    autoCreated: true,
  };
}

export async function getLiveDailyQuiz() {
  const result = await ensureLiveDailyQuiz();
  return result.quiz ?? null;
}

export async function listDailyQuizHistory() {
  const snapshot = await adminDb.collection("dailyQuizzes").get();

  return snapshot.docs
    .map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }))
    .sort((a: any, b: any) => {
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
  const attemptsRaw = attemptsSnap.docs.map((doc) => {
    const data = doc.data() as Record<string, unknown> & {
      uid?: unknown;
      selectedIndex?: unknown;
      correct?: unknown;
      createdAt?: unknown;
    };
    return {
      id: doc.id,
      ...data,
    };
  });
  const userIds = Array.from(
    new Set(attemptsRaw.map((attempt) => String(attempt.uid || "").trim()).filter(Boolean))
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

export async function submitTodayDailyQuizAttempt(params: {
  uid: string;
  selectedIndex: unknown;
}) {
  if (params.selectedIndex === undefined) {
    throw new Error("Invalid submission");
  }

  const liveQuiz = await getLiveDailyQuiz();
  if (!liveQuiz?.id) {
    throw new Error("Quiz not found");
  }

  const quizRef = adminDb.collection("dailyQuizzes").doc(String(liveQuiz.id));
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
      updatedAt: FieldValue.serverTimestamp(),
    });
  });

  return { correct };
}
