import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import {
  getVivaAttemptsCollection,
  toPositiveNumber,
  updateUserStats,
} from "@/lib/server/candidateProgress";
import { requireAppUser, tierLockedResponse } from "@/lib/server/appSession";

export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const { caseId, report, mode, score, durationSeconds } = body;

    if (!caseId) {
      return NextResponse.json({ error: "caseId is required" }, { status: 400 });
    }

    const caseDoc = await adminDb.collection("vivaCases").doc(String(caseId)).get();
    if (!caseDoc.exists) {
      return NextResponse.json({ error: "Case not found" }, { status: 404 });
    }

    const vivaCaseData = caseDoc.data() ?? {};
    const accessContext = await buildAppContentAccessContext(auth.user);
    const access = accessContext.getVivaAccess({
      id: String(caseId),
      folderId: vivaCaseData?.folderId ? String(vivaCaseData.folderId) : null,
      accessType: vivaCaseData?.accessType === "public" ? "public" : "restricted",
    });

    if (!access.allowed || access.mode === "locked") {
      return tierLockedResponse({
        feature: "ai-viva",
        tier: auth.user.tier,
        requiredTier: "paid",
        reason:
          access.reason ||
          "This AI viva case is locked until the matching course or section is unlocked.",
      });
    }

    const candidate = {
      uid: auth.user.uid,
      name: auth.user.name || "Candidate",
      email: auth.user.email || "",
    };

    if (!candidate.email) {
      return NextResponse.json({ error: "Authenticated email required" }, { status: 400 });
    }

    const submittedAt = new Date().toISOString();
    const numericScore =
      score === undefined || score === null ? null : toPositiveNumber(score, 0);
    const numericDuration =
      durationSeconds === undefined || durationSeconds === null
        ? null
        : toPositiveNumber(durationSeconds, 0);
    const consumedMinutes =
      numericDuration && numericDuration > 0 ? Math.ceil(numericDuration / 60) : 0;
    const caseTitle =
      String(vivaCaseData?.case?.title || vivaCaseData?.title || "").trim() || null;

    await Promise.all([
      adminDb.collection("vivaAttempts").add({
        caseId,
        candidate,
        caseTitle,
        report: report ?? null,
        createdAt: FieldValue.serverTimestamp(),
      }),
      getVivaAttemptsCollection(auth.user.uid).doc().set({
        caseId,
        caseTitle,
        mode:
          mode === "Fast and Furious" ? "Fast and Furious" : "Calm and Composed",
        report: report ?? null,
        score: numericScore,
        durationSeconds: numericDuration,
        submittedAt,
      }),
      caseDoc.ref.update({
        attemptsCount: FieldValue.increment(1),
      }),
      consumedMinutes > 0
        ? adminDb.collection("users").doc(auth.user.uid).set(
            {
              vivaMinutesUsed: FieldValue.increment(consumedMinutes),
              updatedAt: submittedAt,
            },
            { merge: true }
          )
        : Promise.resolve(),
      updateUserStats(auth.user.uid, (current) => ({
        vivaAttempts: current.vivaAttempts + 1,
        lastActivityAt: submittedAt,
      })),
    ]);

    return NextResponse.json({
      success: true,
      vivaCredit: consumedMinutes
        ? {
            ...accessContext.vivaCredit,
            usedMinutes: accessContext.vivaCredit.usedMinutes + consumedMinutes,
            remainingMinutes:
              accessContext.vivaCredit.totalMinutes > 0
                ? Math.max(
                    0,
                    accessContext.vivaCredit.remainingMinutes - consumedMinutes
                  )
                : 0,
          }
        : accessContext.vivaCredit,
    });
  } catch (error) {
    console.error("App viva attempt submit error:", error);
    return NextResponse.json({ error: "Failed to submit attempt" }, { status: 500 });
  }
}
