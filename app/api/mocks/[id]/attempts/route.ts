import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const { name, email, marks } = body;

    if (!name || !email || marks === undefined || marks === null) {
      return NextResponse.json(
        { error: "Name, email and marks are required" },
        { status: 400 }
      );
    }

    const mockRef = adminDb.collection("mocks").doc(id);
    const mockDoc = await mockRef.get();

    if (!mockDoc.exists) {
      return NextResponse.json(
        { error: "Mock not found" },
        { status: 404 }
      );
    }

    const mockData = mockDoc.data();
    const existingAttempts = Array.isArray(mockData?.attempts) ? mockData.attempts : [];

    const nextAttempt = {
      candidate: {
        name: String(name).trim(),
        email: String(email).trim().toLowerCase(),
      },
      marks: typeof marks === "number" ? marks : Number(marks),
      createdAt: new Date().toISOString(),
    };

    if (!nextAttempt.candidate.name || !nextAttempt.candidate.email || Number.isNaN(nextAttempt.marks)) {
      return NextResponse.json(
        { error: "Invalid attempt payload" },
        { status: 400 }
      );
    }

    const attempts = [...existingAttempts, nextAttempt];

    await mockRef.update({
      attempts,
      attemptsCount: attempts.length,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      attemptsCount: attempts.length,
      attempt: nextAttempt,
    });
  } catch (error) {
    console.error("Mock attempt submit error:", error);
    return NextResponse.json(
      { error: "Failed to submit mock attempt" },
      { status: 500 }
    );
  }
}
