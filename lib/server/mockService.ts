import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";

type MockAttemptInput = {
  name?: unknown;
  email?: unknown;
  marks?: unknown;
};

type MockScheduleInput = {
  quizId?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  durationMinutes?: unknown;
  attempts?: unknown;
  accessType?: unknown;
};

type MockAccessType = "public" | "restricted";

function toIsoString(value: unknown) {
  return value && typeof (value as { toDate?: () => Date }).toDate === "function"
    ? (value as { toDate: () => Date }).toDate().toISOString()
    : value ?? null;
}

function normalizeDurationMinutes(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeAccessType(value: unknown): MockAccessType {
  return value === "public" ? "public" : "restricted";
}

function normalizeAttempts(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((attempt) => ({
      candidate: {
        name: String(attempt?.candidate?.name || "").trim(),
        email: String(attempt?.candidate?.email || "").trim().toLowerCase(),
      },
      marks:
        typeof attempt?.marks === "number"
          ? attempt.marks
          : Number(attempt?.marks || 0),
      createdAt: typeof attempt?.createdAt === "string" ? attempt.createdAt : undefined,
    }))
    .filter(
      (attempt) =>
        attempt.candidate.name &&
        attempt.candidate.email &&
        Number.isFinite(attempt.marks)
    );
}

async function getMockQuizOrThrow(quizId: string) {
  const quizDoc = await getAdminDb().collection("quizzes").doc(quizId).get();

  if (!quizDoc.exists) {
    throw new Error("Quiz not found");
  }

  const quizData = quizDoc.data() ?? {};
  if (quizData.type !== "mock" && quizData.type !== "grand-mock") {
    throw new Error("Only mock type quizzes can be linked");
  }

  return {
    id: quizDoc.id,
    data: quizData,
  };
}

async function loadMockQuestions(quizData: Record<string, any>) {
  if (Array.isArray(quizData.questionIds) && quizData.questionIds.length > 0) {
    const snapshots = await Promise.all(
      quizData.questionIds.map((questionId: string) =>
        getAdminDb().collection("questions").doc(questionId).get()
      )
    );

    return snapshots
      .filter((snapshot) => snapshot.exists)
      .map((snapshot) => ({
        id: snapshot.id,
        ...snapshot.data(),
      }));
  }

  if (Array.isArray(quizData.bankIds) && quizData.bankIds.length > 0) {
    const snapshot = await getAdminDb()
      .collection("questions")
      .where("bankId", "in", quizData.bankIds)
      .where("isActive", "==", true)
      .get();

    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
  }

  return [];
}

function buildMockScheduleWindow(params: {
  startTime?: unknown;
  endTime?: unknown;
  durationMinutes?: unknown;
  fallbackStartTime?: unknown;
  fallbackEndTime?: unknown;
  fallbackDurationMinutes: number;
}) {
  const durationMinutes = normalizeDurationMinutes(
    params.durationMinutes,
    params.fallbackDurationMinutes
  );
  const resolvedStartTime = params.startTime
    ? new Date(String(params.startTime))
    : params.fallbackStartTime &&
        typeof (params.fallbackStartTime as { toDate?: () => Date }).toDate === "function"
      ? (params.fallbackStartTime as { toDate: () => Date }).toDate()
      : params.fallbackStartTime
        ? new Date(String(params.fallbackStartTime))
        : null;
  const resolvedEndTime = params.endTime
    ? new Date(String(params.endTime))
    : resolvedStartTime
      ? new Date(resolvedStartTime.getTime() + durationMinutes * 60 * 1000)
      : params.fallbackEndTime &&
          typeof (params.fallbackEndTime as { toDate?: () => Date }).toDate === "function"
        ? (params.fallbackEndTime as { toDate: () => Date }).toDate()
        : params.fallbackEndTime
          ? new Date(String(params.fallbackEndTime))
          : null;

  return {
    durationMinutes,
    startTime: resolvedStartTime,
    endTime: resolvedEndTime,
  };
}

export async function listMocks() {
  const snapshot = await getAdminDb()
    .collection("mocks")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      ...data,
      accessType: normalizeAccessType(data.accessType),
      attemptsCount: Array.isArray(data.attempts)
        ? data.attempts.length
        : data.attemptsCount ?? 0,
    };
  });
}

export async function createMockSchedule(input: MockScheduleInput) {
  const quizId = String(input.quizId || "").trim();
  const startTime = String(input.startTime || "").trim();

  if (!quizId || !startTime) {
    throw new Error("Quiz and start time required");
  }

  const quiz = await getMockQuizOrThrow(quizId);
  const schedule = buildMockScheduleWindow({
    startTime,
    endTime: input.endTime,
    durationMinutes: input.durationMinutes,
    fallbackDurationMinutes: normalizeDurationMinutes(quiz.data.durationMinutes, 60),
  });

  const docRef = await getAdminDb().collection("mocks").add({
    quizId,
    title: quiz.data.title || "Untitled Mock",
    type: quiz.data.type,
    accessType: normalizeAccessType(input.accessType),
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    durationMinutes: schedule.durationMinutes,
    attempts: [],
    attemptsCount: 0,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    id: docRef.id,
    title: String(quiz.data.title || "Untitled Mock"),
    type: String(quiz.data.type || "mock"),
    accessType: normalizeAccessType(input.accessType),
  };
}

export async function getMockDetails(id: string) {
  const mockDoc = await getAdminDb().collection("mocks").doc(id).get();

  if (!mockDoc.exists) {
    throw new Error("Mock not found");
  }

  const mockData = mockDoc.data() ?? {};
  const quiz = await getMockQuizOrThrow(String(mockData.quizId || ""));
  const questions = await loadMockQuestions(quiz.data);

  return {
    id: mockDoc.id,
    ...mockData,
    accessType: normalizeAccessType(mockData.accessType),
    startTime: toIsoString(mockData.startTime),
    endTime: toIsoString(mockData.endTime),
    attempts: Array.isArray(mockData.attempts) ? mockData.attempts : [],
    attemptsCount: Array.isArray(mockData.attempts)
      ? mockData.attempts.length
      : mockData.attemptsCount ?? 0,
    quiz: {
      id: quiz.id,
      ...quiz.data,
    },
    questions,
  };
}

export async function updateMockSchedule(id: string, input: MockScheduleInput) {
  const mockRef = getAdminDb().collection("mocks").doc(id);
  const existingMockDoc = await mockRef.get();

  if (!existingMockDoc.exists) {
    throw new Error("Mock not found");
  }

  const existingMock = existingMockDoc.data() ?? {};
  const nextQuizId = String(input.quizId || existingMock.quizId || "").trim();
  const quiz = await getMockQuizOrThrow(nextQuizId);
  const nextAccessType = normalizeAccessType(input.accessType ?? existingMock.accessType);
  const normalizedAttempts =
    input.attempts !== undefined
      ? normalizeAttempts(input.attempts)
      : normalizeAttempts(existingMock.attempts);
  const schedule = buildMockScheduleWindow({
    startTime: input.startTime,
    endTime: input.endTime,
    durationMinutes: input.durationMinutes,
    fallbackStartTime: existingMock.startTime,
    fallbackEndTime: existingMock.endTime,
    fallbackDurationMinutes: normalizeDurationMinutes(
      existingMock.durationMinutes,
      normalizeDurationMinutes(quiz.data.durationMinutes, 60)
    ),
  });

  await mockRef.update({
    quizId: nextQuizId,
    title: quiz.data.title || existingMock.title || "Untitled Mock",
    type: quiz.data.type || existingMock.type || "mock",
    accessType: nextAccessType,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    durationMinutes: schedule.durationMinutes,
    attempts: normalizedAttempts,
    attemptsCount: normalizedAttempts.length,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return { success: true };
}

export async function deleteMockSchedule(id: string) {
  await getAdminDb().collection("mocks").doc(id).delete();
  return { success: true };
}

export async function addAdminMockAttempt(id: string, input: MockAttemptInput) {
  return addMockAttempt(id, input);
}

async function addMockAttempt(id: string, input: MockAttemptInput) {
  const name = String(input.name || "").trim();
  const email = String(input.email || "").trim().toLowerCase();
  const marks = typeof input.marks === "number" ? input.marks : Number(input.marks);

  if (!name || !email || !Number.isFinite(marks)) {
    throw new Error("Name, email and marks are required");
  }

  const mockRef = getAdminDb().collection("mocks").doc(id);
  const mockDoc = await mockRef.get();

  if (!mockDoc.exists) {
    throw new Error("Mock not found");
  }

  const mockData = mockDoc.data() ?? {};
  const existingAttempts = Array.isArray(mockData.attempts) ? mockData.attempts : [];
  const nextAttempt = {
    candidate: {
      name,
      email,
    },
    marks,
    createdAt: new Date().toISOString(),
  };
  const attempts = [...existingAttempts, nextAttempt];

  await mockRef.update({
    attempts,
    attemptsCount: attempts.length,
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    attemptsCount: attempts.length,
    attempt: nextAttempt,
  };
}

export async function addPublicMockAttempt(id: string, input: MockAttemptInput) {
  const mockDoc = await getAdminDb().collection("mocks").doc(id).get();

  if (!mockDoc.exists) {
    throw new Error("Mock not found");
  }

  const mockData = mockDoc.data() ?? {};
  if (normalizeAccessType(mockData.accessType) !== "public") {
    throw new Error("Mock is not publicly available");
  }

  return addMockAttempt(id, input);
}
