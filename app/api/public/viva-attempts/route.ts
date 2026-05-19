import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getVivaCaseById, isTrialVivaCase } from "@/lib/server/vivaService";
import { toPositiveNumber } from "@/lib/server/candidateProgress";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { caseId, name, email, report, mode, score, durationSeconds } = body;

    const normalizedCaseId = String(caseId || "").trim();
    const candidateName = String(name || "").trim();
    const candidateEmail = String(email || "").trim().toLowerCase();

    if (!normalizedCaseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    if (!candidateName || !candidateEmail) {
      return NextResponse.json({ error: "Name and email are required" }, { status: 400 });
    }

    const vivaCase = await getVivaCaseById(normalizedCaseId);
    if (!isTrialVivaCase(vivaCase)) {
      return NextResponse.json({ error: "Trial case not found" }, { status: 404 });
    }

    await Promise.all([
      adminDb.collection("vivaAttempts").add({
        caseId: normalizedCaseId,
        candidate: {
          name: candidateName,
          email: candidateEmail,
        },
        mode: mode === "Fast and Furious" ? "Fast and Furious" : "Calm and Composed",
        report: report ?? null,
        score:
          score === undefined || score === null ? null : toPositiveNumber(score, 0),
        durationSeconds:
          durationSeconds === undefined || durationSeconds === null
            ? null
            : toPositiveNumber(durationSeconds, 0),
        source: "public-trial",
        createdAt: FieldValue.serverTimestamp(),
      }),
      adminDb.collection("vivaCases").doc(normalizedCaseId).update({
        attemptsCount: FieldValue.increment(1),
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Public trial viva attempt error:", error);
    return NextResponse.json({ error: "Failed to submit trial attempt" }, { status: 500 });
  }
}
