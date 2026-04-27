import { NextRequest, NextResponse } from "next/server";
import { FREE_WEEKLY_MOCK_PREVIEW_LIMIT, getMockAccess } from "@/lib/appAccess";
import { adminDb } from "@/lib/firebaseAdmin";
import { getWeeklyMockPreviewUsage } from "@/lib/server/appUsage";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  const mockAccess = getMockAccess(auth.user.tier);

  if (!mockAccess.allowed) {
    return tierLockedResponse({
      feature: "mocks",
      tier: auth.user.tier,
      requiredTier: mockAccess.requiredTier ?? "free",
      reason: mockAccess.reason ?? "Mocks are locked.",
    });
  }

  try {
    const snapshot = await adminDb.collection("mocks").orderBy("createdAt", "desc").get();
    const usage =
      auth.user.tier === "free"
        ? await getWeeklyMockPreviewUsage(auth.user.uid, FREE_WEEKLY_MOCK_PREVIEW_LIMIT)
        : null;

    const mocks = snapshot.docs.map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        attemptsCount: Array.isArray(data.attempts)
          ? data.attempts.length
          : data.attemptsCount ?? 0,
        ...data,
        access: {
          tier: auth.user.tier,
          allowed: true,
          mode: mockAccess.mode,
          weeklyQuestionLimit: mockAccess.weeklyQuestionLimit,
          weeklyRemainingQuestions: usage?.usage.remainingQuestions ?? null,
          alreadyGrantedQuestionsForThisMock:
            usage?.usage.previewByContent?.[doc.id] ?? 0,
        },
      };
    });

    return NextResponse.json({ tier: auth.user.tier, mocks });
  } catch (error) {
    console.error("App mocks fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch mocks" }, { status: 500 });
  }
}
