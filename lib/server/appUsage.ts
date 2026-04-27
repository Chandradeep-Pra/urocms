import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

export interface WeeklyMockPreviewUsage {
  consumedQuestions: number;
  previewByContent: Record<string, number>;
  remainingQuestions: number;
}

function getWeekKey(date = new Date()) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((utcDate.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${utcDate.getUTCFullYear()}-W${String(weekNo).padStart(2, "0")}`;
}

function getUsageDocId(uid: string, feature: string) {
  return `${uid}_${getWeekKey()}_${feature}`;
}

export async function getWeeklyMockPreviewUsage(uid: string, weeklyLimit: number) {
  const docRef = adminDb.collection("featureUsage").doc(getUsageDocId(uid, "mock-preview"));
  const doc = await docRef.get();

  const data = doc.data() ?? {};
  const previewByContent =
    typeof data.previewByContent === "object" && data.previewByContent !== null
      ? (data.previewByContent as Record<string, number>)
      : {};
  const consumedQuestions =
    typeof data.consumedQuestions === "number" ? data.consumedQuestions : 0;

  return {
    docRef,
    usage: {
      consumedQuestions,
      previewByContent,
      remainingQuestions: Math.max(weeklyLimit - consumedQuestions, 0),
    } satisfies WeeklyMockPreviewUsage,
  };
}

export async function grantWeeklyMockPreview(params: {
  uid: string;
  contentId: string;
  weeklyLimit: number;
  availableQuestionCount: number;
}) {
  const { docRef, usage } = await getWeeklyMockPreviewUsage(params.uid, params.weeklyLimit);
  const existingGrant = Number(usage.previewByContent[params.contentId] ?? 0);

  if (existingGrant > 0) {
    return {
      grantedQuestions: existingGrant,
      consumedQuestions: usage.consumedQuestions,
      remainingQuestions: Math.max(params.weeklyLimit - usage.consumedQuestions, 0),
      reusedExistingGrant: true,
    };
  }

  const grantCount = Math.min(usage.remainingQuestions, params.availableQuestionCount);

  if (grantCount <= 0) {
    return {
      grantedQuestions: 0,
      consumedQuestions: usage.consumedQuestions,
      remainingQuestions: 0,
      reusedExistingGrant: false,
    };
  }

  await docRef.set(
    {
      uid: params.uid,
      feature: "mock-preview",
      weekKey: getWeekKey(),
      consumedQuestions: usage.consumedQuestions + grantCount,
      [`previewByContent.${params.contentId}`]: grantCount,
      updatedAt: FieldValue.serverTimestamp(),
      ...(usage.consumedQuestions === 0 ? { createdAt: FieldValue.serverTimestamp() } : {}),
    },
    { merge: true }
  );

  return {
    grantedQuestions: grantCount,
    consumedQuestions: usage.consumedQuestions + grantCount,
    remainingQuestions: Math.max(params.weeklyLimit - (usage.consumedQuestions + grantCount), 0),
    reusedExistingGrant: false,
  };
}
