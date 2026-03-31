// app/api/viva-attempts/route.ts

import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { caseId, candidate, report } = body;

    if (!caseId || !candidate?.email) {
      return NextResponse.json(
        { error: "Invalid attempt data" },
        { status: 400 }
      );
    }

    // Save attempt
    await adminDb.collection("vivaAttempts").add({
      caseId,
      candidate,
      report,
      createdAt: FieldValue.serverTimestamp(),
    });

    // 🔥 increment attempt count (FAST dashboard metric)
    await adminDb.collection("vivaCases").doc(caseId).update({
      attemptsCount: FieldValue.increment(1),
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to submit attempt" },
      { status: 500 }
    );
  }
}