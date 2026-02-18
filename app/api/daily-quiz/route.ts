import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: NextRequest) {
  try {
    const {
      question,
      image,
      options,
      correctIndex,
      explanation,
    } = await req.json();

    // Basic validation
    if (
      !question ||
      !Array.isArray(options) ||
      options.length < 2 ||
      correctIndex === undefined
    ) {
      return NextResponse.json(
        { error: "Invalid quiz payload" },
        { status: 400 }
      );
    }

    const today = new Date().toISOString().split("T")[0];

    await adminDb.collection("dailyQuizzes").doc(today).set({
      question,
      image: image ?? "",
      options,
      correctIndex,
      explanation: explanation ?? "",
      submissions: 0,
      createdAt: FieldValue.serverTimestamp(),
      source: "manual",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to save quiz" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const today = new Date().toISOString().split("T")[0];

    const doc = await adminDb
      .collection("dailyQuizzes")
      .doc(today)
      .get();

    if (!doc.exists) {
      return NextResponse.json({ quiz: null });
    }

    return NextResponse.json({
      quiz: {
        id: doc.id,
        ...doc.data(),
      },
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch quiz" },
      { status: 500 }
    );
  }
}
