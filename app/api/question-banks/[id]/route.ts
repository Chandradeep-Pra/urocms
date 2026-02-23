//@ts-ignore

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

/* ───────── UPDATE BANK ───────── */

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { title, section } = await req.json();

    await adminDb
      .collection("questionBanks")
      .doc(id)
      .update({
        ...(title && { title }),
        ...(section && { section }),
        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Update bank error:", err);
    return NextResponse.json(
      { error: "Failed to update bank" },
      { status: 500 }
    );
  }
}

/* ───────── SOFT DELETE BANK ───────── */

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Invalid ID" },
        { status: 400 }
      );
    }

    await adminDb
      .collection("questionBanks")
      .doc(id)
      .update({
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Delete bank error:", err);

    return NextResponse.json(
      { error: "Failed to delete bank" },
      { status: 500 }
    );
  }
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    const doc = await adminDb
      .collection("questionBanks")
      .doc(id)
      .get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Bank not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      bank: {
        id: doc.id,
        ...doc.data(),
      },
    });

  } catch (err) {
    console.error("Fetch bank error:", err);
    return NextResponse.json(
      { error: "Failed to fetch bank" },
      { status: 500 }
    );
  }
}
