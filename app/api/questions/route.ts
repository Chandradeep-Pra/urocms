// app/api/questions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/* ───────── CREATE QUESTION ───────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const {
      bankId,
      questionText,
      questionImage,
      options,
      correctAnswer,
      explanation,
      difficulty,
      tags,
    } = body;

    if (!bankId || !questionText || !Array.isArray(options) || options.length !== 5) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const docRef = await adminDb.collection("questions").add({
      bankId,
      questionText,
      questionImage: questionImage ?? "",
      options,
      correctAnswer,
      explanation: explanation ?? {},
      difficulty: difficulty ?? "medium",
      tags: tags ?? [],
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    // increment bank question count
    await adminDb.collection("questionBanks").doc(bankId).update({
      questionCount: FieldValue.increment(1),
    });

    return NextResponse.json({ success: true, id: docRef.id });

  } catch (err) {
    console.error("Create question error:", err);
    return NextResponse.json(
      { error: "Failed to create question" },
      { status: 500 }
    );
  }
}

/* ───────── FETCH QUESTIONS BY BANK ───────── */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const bankId = searchParams.get("bankId");

    if (!bankId) {
      return NextResponse.json(
        { error: "bankId required" },
        { status: 400 }
      );
    }

    const snapshot = await adminDb
      .collection("questions")
      .where("bankId", "==", bankId)
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    const questions = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ questions });

  } catch (err) {
    console.error("Fetch questions error:", err);
    return NextResponse.json(
      { error: "Failed to fetch questions" },
      { status: 500 }
    );
  }
}
