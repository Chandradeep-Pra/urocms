import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { canAccessViva } from "@/lib/appAccess";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  getVivaAttemptsCollection,
  toPositiveNumber,
  updateUserStats,
} from "@/lib/server/candidateProgress";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";
import { getVivaCaseById, isTrialVivaCase } from "@/lib/server/vivaService";

export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { caseId, report, mode, score, durationSeconds, name, email } = body;

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    const vivaCase = await getVivaCaseById(caseId);
    const trialCase = isTrialVivaCase(vivaCase);

    if (!canAccessViva(auth.user.tier) && !trialCase) {
      return tierLockedResponse({
        feature: "ai-viva",
        tier: auth.user.tier,
        requiredTier: "paid",
        reason: "AI viva is available only for paid users unless a trial case is published.",
      });
    }

    const candidate = {
      uid: auth.user.uid,
      name:
        String(name || "").trim() ||
        auth.user.name ||
        (trialCase ? "Trial Candidate" : "Paid User"),
      email: String(email || "").trim().toLowerCase() || auth.user.email || "",
    };

    if (!candidate.email) {
      return NextResponse.json(
        { error: trialCase ? "Email is required for trial attempts" : "Authenticated email required" },
        { status: 400 }
      );
    }

    const submittedAt = new Date().toISOString();
    const numericScore =
      score === undefined || score === null ? null : toPositiveNumber(score, 0);
    const numericDuration =
      durationSeconds === undefined || durationSeconds === null
        ? null
        : toPositiveNumber(durationSeconds, 0);

    await Promise.all([
      adminDb.collection("vivaAttempts").add({
        caseId,
        candidate,
        report: report ?? null,
        createdAt: FieldValue.serverTimestamp(),
      }),
      getVivaAttemptsCollection(auth.user.uid).doc().set({
        caseId,
        mode:
          mode === "Fast and Furious" ? "Fast and Furious" : "Calm and Composed",
        report: report ?? null,
        score: numericScore,
        durationSeconds: numericDuration,
        submittedAt,
      }),
      adminDb.collection("vivaCases").doc(caseId).update({
        attemptsCount: FieldValue.increment(1),
      }),
      updateUserStats(auth.user.uid, (current) => ({
        vivaAttempts: current.vivaAttempts + 1,
        lastActivityAt: submittedAt,
      })),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("App viva attempt submit error:", error);
    return NextResponse.json({ error: "Failed to submit attempt" }, { status: 500 });
  }
}
