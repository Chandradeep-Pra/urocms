import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

export async function PUT(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    await adminDb
      .collection("chapters")
      .doc(id)
      .update({
        ...body,
        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Update chapter error:", err);
    return NextResponse.json(
      { error: "Failed to update chapter" },
      { status: 500 }
    );
  }
}


export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;

  await adminDb
    .collection("chapters")
    .doc(id)
    .update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

  return NextResponse.json({ success: true });
}

