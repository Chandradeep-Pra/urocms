import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title) {
      return NextResponse.json(
        { error: "Title is required" },
        { status: 400 }
      );
    }

    const verificationId = generateSlug(body.title);

    const docRef = adminDb
      .collection("quizzes")
      .doc(verificationId);

    const existingDoc = await docRef.get();

    // 🔥 Prevent duplicate slug
    if (existingDoc.exists) {
      return NextResponse.json(
        { error: "Quiz with same slug already exists" },
        { status: 400 }
      );
    }

    await docRef.set({
      ...body,
      verificationId,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: verificationId, // 🔥 ID is now slug
      verificationId,
    });

  } catch (err) {
    console.error("Create quiz error:", err);

    return NextResponse.json(
      { error: "Failed to create quiz" },
      { status: 500 }
    );
  }
}


export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("quizzes")
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    const quizzes = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ quizzes });

  } catch (err) {
    console.error("Fetch quizzes error:", err);
    return NextResponse.json(
      { error: "Failed to fetch quizzes" },
      { status: 500 }
    );
  }
}

