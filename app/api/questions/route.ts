// app/api/questions/route.ts

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "@/lib/server/adminAccess";

/* ───────── CREATE QUESTION ───────── */
export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

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
      questions,
    } = body;

    if (!bankId) {
      return NextResponse.json(
        { error: "bankId is required" },
        { status: 400 }
      );
    }

    if (Array.isArray(questions)) {
      if (questions.length === 0) {
        return NextResponse.json(
          { error: "At least one question is required" },
          { status: 400 }
        );
      }

      const invalid = questions.some(
        (item) =>
          !item?.questionText ||
          !Array.isArray(item?.options) ||
          item.options.length !== 5
      );

      if (invalid) {
        return NextResponse.json(
          { error: "Each queued question must include text and 5 options" },
          { status: 400 }
        );
      }

      const batch = adminDb.batch();

      questions.forEach((item) => {
        const ref = adminDb.collection("questions").doc();
        batch.set(ref, {
          bankId,
          questionText: item.questionText,
          questionImage: item.questionImage ?? "",
          options: item.options,
          correctAnswer: item.correctAnswer ?? 0,
          explanation: item.explanation ?? {},
          difficulty: item.difficulty ?? difficulty ?? "medium",
          tags: item.tags ?? tags ?? [],
          isActive: true,
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        });
      });

      batch.update(adminDb.collection("questionBanks").doc(bankId), {
        questionCount: FieldValue.increment(questions.length),
      });

      await batch.commit();

      return NextResponse.json({
        success: true,
        count: questions.length,
      });
    }

    if (!questionText || !Array.isArray(options) || options.length !== 5) {
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
  const { response } = await requireAdminSession(req);
  if (response) return response;

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
