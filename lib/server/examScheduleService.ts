import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";

export interface ExamSchedule {
  id: string;
  examName: string;
  examDate: string; // ISO date string "YYYY-MM-DD"
  createdAt?: { _seconds: number } | string | Date;
  updatedAt?: { _seconds: number } | string | Date;
}

type ExamScheduleInput = {
  examName?: unknown;
  examDate?: unknown;
};

function normalizeExamSchedule(input: ExamScheduleInput) {
  return {
    examName: String(input.examName || "").trim(),
    examDate: String(input.examDate || "").trim(),
  };
}

function validateExamSchedule(payload: ReturnType<typeof normalizeExamSchedule>) {
  if (!payload.examName) {
    throw new Error("Exam name is required");
  }
  if (!payload.examDate || !/^\d{4}-\d{2}-\d{2}$/.test(payload.examDate)) {
    throw new Error("A valid exam date (YYYY-MM-DD) is required");
  }
}

export async function listExamSchedules(): Promise<ExamSchedule[]> {
  const snapshot = await getAdminDb()
    .collection("examSchedules")
    .orderBy("examDate", "asc")
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<ExamSchedule, "id">),
  }));
}

export async function createExamSchedule(input: ExamScheduleInput): Promise<ExamSchedule> {
  const payload = normalizeExamSchedule(input);
  validateExamSchedule(payload);

  const docRef = await getAdminDb().collection("examSchedules").add({
    examName: payload.examName,
    examDate: payload.examDate,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return {
    id: docRef.id,
    examName: payload.examName,
    examDate: payload.examDate,
  };
}

export async function updateExamSchedule(
  id: string,
  input: ExamScheduleInput
): Promise<ExamSchedule> {
  const payload = normalizeExamSchedule(input);
  validateExamSchedule(payload);

  const ref = getAdminDb().collection("examSchedules").doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error("Exam schedule not found");
  }

  await ref.set(
    {
      examName: payload.examName,
      examDate: payload.examDate,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return {
    id,
    examName: payload.examName,
    examDate: payload.examDate,
  };
}

export async function deleteExamSchedule(id: string): Promise<{ success: boolean }> {
  const ref = getAdminDb().collection("examSchedules").doc(id);
  const snap = await ref.get();

  if (!snap.exists) {
    throw new Error("Exam schedule not found");
  }

  await ref.delete();
  return { success: true };
}

