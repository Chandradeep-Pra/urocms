import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { getPublicVivaCaseById } from "@/lib/server/vivaService";

function normalizeText(value: unknown) {
  return String(value || "").trim();
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const name = normalizeText(body?.name);
    const email = normalizeText(body?.email).toLowerCase();
    const source = normalizeText(body?.source) || "external-web";

    if (!name || !email || !email.includes("@")) {
      return NextResponse.json(
        { error: "Name and a valid email are required" },
        { status: 400 }
      );
    }

    await getPublicVivaCaseById(id);

    const participant = {
      name,
      email,
      source,
      status: "started" as const,
      startedAt: new Date().toISOString(),
    };

    await Promise.all([
      adminDb.collection("publicVivaAttempts").add({
        caseId: id,
        candidate: {
          name,
          email,
        },
        source,
        status: "started",
        createdAt: FieldValue.serverTimestamp(),
      }),
      adminDb.collection("vivaCases").doc(id).update({
        publicParticipants: FieldValue.arrayUnion(participant),
        updatedAt: FieldValue.serverTimestamp(),
      }),
    ]);

    return NextResponse.json({
      success: true,
      participant,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start viva";
    console.error("Public viva start error:", error);
    return NextResponse.json(
      { error: message },
      { status: message === "Case not found" ? 404 : 500 }
    );
  }
}
