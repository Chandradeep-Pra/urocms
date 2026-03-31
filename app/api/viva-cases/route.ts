// app/api/viva-cases/route.ts

import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

/* ───────── GET ALL CASES ───────── */
export async function GET() {
  try {
    const snapshot = await adminDb
      .collection("vivaCases")
      .where("isActive", "==", true)
      .orderBy("createdAt", "desc")
      .get();

    const cases = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ cases });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch cases" },
      { status: 500 }
    );
  }
}

/* ───────── CREATE CASE ───────── */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const { case: caseData } = body;

    if (!caseData?.title || !caseData?.stem) {
      return NextResponse.json(
        { error: "Title & stem required" },
        { status: 400 }
      );
    }

    const docRef = await adminDb.collection("vivaCases").add({
      ...body,
      attemptsCount: 0,
      isActive: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({
      success: true,
      id: docRef.id,
    });

  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to create case" },
      { status: 500 }
    );
  }
} 