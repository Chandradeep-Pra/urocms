import { FieldValue } from "firebase-admin/firestore";
import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { firstMockAttempts, isHiddenMockRankEmail } from "@/lib/server/mockAttempts";
import { createMockCompletion, withOriginalMockCompletion, recordedMockSeconds } from "@/lib/server/mockAttemptTracking";

type MockAttemptInput = {
  name?: unknown;
  email?: unknown;
  marks?: unknown;
  userImage?: unknown;
  image?: unknown;
  totalQuestions?: unknown;
  timeTakenSeconds?: unknown;
  answers?: unknown;
  submissionId?: unknown;
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

export function formatRelativeAttended(dateInput: unknown): string {
  if (!dateInput) return "Today";
  const date =
    dateInput instanceof Date
      ? dateInput
      : typeof (dateInput as { toDate?: () => Date })?.toDate === "function"
        ? (dateInput as { toDate: () => Date }).toDate()
        : new Date(String(dateInput));

  if (Number.isNaN(date.getTime())) return "Today";

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  if (diffMs < 0) return "Today";

  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays === 0) {
    return "Today";
  }
  if (diffDays === 1) {
    return "1 day ago";
  }
  if (diffDays < 7) {
    return `${diffDays} days ago`;
  }
  const diffWeeks = Math.floor(diffDays / 7);
  if (diffWeeks === 1) {
    return "1 week ago";
  }
  if (diffWeeks < 4) {
    return `${diffWeeks} weeks ago`;
  }
  const diffMonths = Math.floor(diffDays / 30);
  if (diffMonths <= 1) {
    return "1 month ago";
  }
  if (diffMonths < 12) {
    return `${diffMonths} months ago`;
  }
  const diffYears = Math.floor(diffDays / 365);
  return diffYears <= 1 ? "1 year ago" : `${diffYears} years ago`;
}

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

function firstImage(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
}

function normalizeAttempts(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((attempt) => ({
      attemptNumber: typeof attempt?.attemptNumber === "number" ? attempt.attemptNumber : 1,
      candidate: {
        ...(typeof attempt?.candidate?.uid === "string" ? { uid: attempt.candidate.uid } : {}),
        name: String(attempt?.candidate?.name || attempt?.name || "").trim(),
        email: String(attempt?.candidate?.email || attempt?.email || "").trim().toLowerCase(),
        image: firstImage(
          attempt?.candidate?.image,
          attempt?.candidate?.userImage,
          attempt?.candidate?.profileImageUrl,
          attempt?.userImage,
          attempt?.image,
          attempt?.profileImageUrl,
          attempt?.photoURL,
        ),
      },
      marks:
        typeof attempt?.marks === "number"
          ? attempt.marks
          : Number(attempt?.marks || 0),
      maxMarks: typeof attempt?.maxMarks === "number" ? attempt.maxMarks : undefined,
      createdAt: typeof attempt?.createdAt === "string" ? attempt.createdAt : undefined,
      timeTakenSeconds: recordedMockSeconds(attempt?.timeTakenSeconds),
      ...(typeof attempt?.completionKey === "string" ? { completionKey: attempt.completionKey } : {}),
    }))
    .filter(
      (attempt) =>
        attempt.candidate.name &&
        attempt.candidate.email &&
        Number.isFinite(attempt.marks)
    );
}

async function loadRankingProfileImages(attempts: ReturnType<typeof normalizeAttempts>) {
  const images = new Map<string, string>();
  const emails = [...new Set(attempts.map((attempt) => attempt.candidate.email))];
  for (const attempt of attempts) {
    if (attempt.candidate.image) images.set(attempt.candidate.email, attempt.candidate.image);
  }

  // Resolve current photos for old attempts without rewriting scores or history.
  for (let index = 0; index < emails.length; index += 30) {
    try {
      const snapshot = await getAdminDb().collection("users")
        .where("email", "in", emails.slice(index, index + 30))
        .select("email", "profileImageUrl", "isShadowDuplicate", "canonicalUserId")
        .get();
      for (const doc of snapshot.docs) {
        const profile = doc.data();
        if (profile.isShadowDuplicate === true ||
            profile.canonicalUserId && profile.canonicalUserId !== doc.id) continue;
        const email = String(profile.email || "").trim().toLowerCase();
        const image = firstImage(profile.profileImageUrl);
        if (image) images.set(email, image);
      }
    } catch {
      // A profile service failure must not hide otherwise valid rankings.
      console.warn("Could not load ranking profile photos; using saved photos where available.");
    }
  }

  const missingEmails = emails.filter((email) => !images.has(email));
  for (let index = 0; index < missingEmails.length; index += 100) {
    try {
      const result = await getAdminAuth().getUsers(
        missingEmails.slice(index, index + 100).map((email) => ({ email })),
      );
      for (const user of result.users) {
        const email = String(user.email || "").trim().toLowerCase();
        const image = firstImage(user.photoURL, ...user.providerData.map((provider) => provider.photoURL));
        if (image) images.set(email, image);
      }
    } catch {
      console.warn("Could not load Firebase Auth ranking photos; using initials where unavailable.");
    }
  }
  return images;
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

async function loadMockQuestions(quizData: Record<string, unknown>) {
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

  // Batch-fetch linked quiz docs to get description + questionCount cheaply
  const uniqueQuizIds = [
    ...new Set(
      snapshot.docs
        .map((doc) => String(doc.data().quizId || "").trim())
        .filter(Boolean),
    ),
  ];

  const quizDataByQuizId = new Map<string, Record<string, unknown>>();
  if (uniqueQuizIds.length > 0) {
    const quizSnapshots = await Promise.all(
      uniqueQuizIds.map((quizId) =>
        getAdminDb().collection("quizzes").doc(quizId).get(),
      ),
    );
    quizSnapshots.forEach((snap) => {
      if (snap.exists) quizDataByQuizId.set(snap.id, snap.data() ?? {});
    });
  }

  return snapshot.docs.map((doc) => {
    const data = doc.data();
    const quizId = String(data.quizId || "").trim();
    const quizData = quizDataByQuizId.get(quizId);

    // Derive question count: prefer the quiz's questionIds array length
    const questionCount =
      quizData && Array.isArray(quizData.questionIds)
        ? quizData.questionIds.length
        : typeof data.questionCount === "number"
          ? data.questionCount
          : typeof data.totalQuestions === "number"
            ? data.totalQuestions
            : undefined;

    // Derive description from quiz or mock doc
    const description =
      typeof quizData?.description === "string" && quizData.description.trim()
        ? quizData.description.trim()
        : typeof data.description === "string" && data.description.trim()
          ? data.description.trim()
          : undefined;

    return {
      id: doc.id,
      ...data,
      accessType: normalizeAccessType(data.accessType),
      attemptsCount: Array.isArray(data.attempts)
        ? data.attempts.length
        : data.attemptsCount ?? 0,
      ...(questionCount !== undefined ? { questionCount } : {}),
      ...(description !== undefined ? { description } : {}),
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
    description: String(quiz.data.description || "").trim(),
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
    description: String(quiz.data.description || mockData.description || "").trim(),
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
    description: String(quiz.data.description || "").trim(),
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
  const rawMarks = typeof input.marks === "number" ? input.marks : Number(input.marks);

  if (!name || !email || !Number.isFinite(rawMarks)) {
    throw new Error("Name, email and marks are required");
  }

  const mockRef = getAdminDb().collection("mocks").doc(id);
  const mockDoc = await mockRef.get();

  if (!mockDoc.exists) {
    throw new Error("Mock not found");
  }

  const mockData = mockDoc.data() ?? {};

  // Determine max marks from quiz questions or input totalQuestions
  let maxMarks = 0;
  try {
    if (mockData.quizId) {
      const quiz = await getMockQuizOrThrow(String(mockData.quizId));
      const questions = await loadMockQuestions(quiz.data);
      if (questions.length > 0) {
        maxMarks = questions.length;
      }
    }
  } catch {
    // ignore
  }

  if (!maxMarks && typeof input.totalQuestions === "number" && input.totalQuestions > 0) {
    maxMarks = Math.round(input.totalQuestions);
  }

  // Clamping: User marks cannot exceed total questions
  const marks = maxMarks > 0
    ? Math.max(0, Math.min(Math.round(rawMarks), maxMarks))
    : Math.max(0, Math.round(rawMarks));

  const userImage =
    typeof input.userImage === "string" && input.userImage.trim()
      ? input.userImage.trim()
      : typeof input.image === "string" && input.image.trim()
        ? input.image.trim()
        : null;

  const createdAt = new Date().toISOString();
  const completion = createMockCompletion({ name, email }, {
    marks, totalQuestions: maxMarks || 0, timeTakenSeconds: input.timeTakenSeconds,
    answers: input.answers, submissionId: input.submissionId,
  }, createdAt);
  const completionRef = mockRef.collection("submissions").doc(completion.id);
  const nextAttempt = {
    attemptNumber: 1,
    candidate: {
      name,
      email,
      image: userImage,
    },
    marks,
    maxMarks: maxMarks > 0 ? maxMarks : undefined,
    createdAt,
    timeTakenSeconds: completion.record.timeTakenSeconds,
    completionKey: completion.id,
  };

  return getAdminDb().runTransaction(async (transaction) => {
    const [latest, savedCompletion] = await Promise.all([
      transaction.get(mockRef), transaction.get(completionRef),
    ]);
    if (!latest.exists) throw new Error("Mock not found");
    const data = latest.data() ?? {};
    const attempts = firstMockAttempts(
      Array.isArray(data.attempts) ? data.attempts : [],
      Array.isArray(data.history) ? data.history : [],
    );
    const existing = attempts.find((attempt) => String(attempt?.candidate?.email || attempt?.email || "").trim().toLowerCase() === email);
    if (!savedCompletion.exists) transaction.set(completionRef,
      withOriginalMockCompletion(completion.id, completion.record, existing));
    if (existing) return { attemptsCount: attempts.length, attempt: existing, replacedExisting: false, alreadyRecorded: true };
    attempts.push(nextAttempt);
    transaction.update(mockRef, { attempts, attemptsCount: attempts.length, updatedAt: FieldValue.serverTimestamp() });
    return { attemptsCount: attempts.length, attempt: nextAttempt, replacedExisting: false, alreadyRecorded: false };
  });
}

export async function getPublicMockResults(id: string, allowRestricted = false) {
  const mockDoc = await getAdminDb().collection("mocks").doc(id).get();

  if (!mockDoc.exists) {
    throw new Error("Mock not found");
  }

  const mockData = mockDoc.data() ?? {};
  if (!allowRestricted && normalizeAccessType(mockData.accessType) !== "public") {
    throw new Error("Mock is not publicly available");
  }

  let maxMarks: number | null = null;
  try {
    if (mockData.quizId) {
      const quiz = await getMockQuizOrThrow(String(mockData.quizId));
      const questions = await loadMockQuestions(quiz.data);
      if (questions.length > 0) {
        maxMarks = questions.length;
      }
    }
  } catch {
    // ignore
  }

  const deduplicated = firstMockAttempts(normalizeAttempts(mockData.attempts), normalizeAttempts(mockData.history))
    .filter((attempt) => !isHiddenMockRankEmail(attempt.candidate.email))
    .map((attempt) => ({ ...attempt, marks: maxMarks && maxMarks > 0 ? Math.max(0, Math.min(Math.round(attempt.marks), maxMarks)) : Math.max(0, Math.round(attempt.marks)) }));
  deduplicated.sort((a, b) => {
    if (b.marks !== a.marks) return b.marks - a.marks;
    const timeA = Date.parse(a.createdAt || "") || 0;
    const timeB = Date.parse(b.createdAt || "") || 0;
    return timeA - timeB || a.candidate.email.localeCompare(b.candidate.email);
  });

  const profileImages = await loadRankingProfileImages(deduplicated);
  const results = deduplicated.map((attempt, index) => {
    const rawMarks = attempt.marks;
    const clampedMarks = maxMarks && maxMarks > 0
      ? Math.max(0, Math.min(Math.round(rawMarks), maxMarks))
      : Math.max(0, Math.round(rawMarks));

    return {
      rank: index + 1,
      name: attempt.candidate.name,
      email: attempt.candidate.email,
      userImage: profileImages.get(attempt.candidate.email) || null,
      marks: clampedMarks,
      maxMarks: attempt.maxMarks ?? maxMarks,
      attended: formatRelativeAttended(attempt.createdAt),
      submittedAt: attempt.createdAt ?? null,
    };
  });

  return {
    mock: {
      id: mockDoc.id,
      title: String(mockData.title || "Untitled Mock"),
      type: String(mockData.type || "mock"),
      startTime: toIsoString(mockData.startTime),
      endTime: toIsoString(mockData.endTime),
      totalQuestions: maxMarks,
    },
    attemptsCount: results.length,
    results,
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
