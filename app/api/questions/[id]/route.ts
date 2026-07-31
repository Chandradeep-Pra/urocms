import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  const { id } = await params;

  try {
    const body = await req.json();

    await getAdminDb()
      .collection("questions")
      .doc(id)
      .update({
        ...body,
        updatedAt: FieldValue.serverTimestamp(),
      });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Update question error:", err);
    return NextResponse.json(
      { error: "Failed to update question" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  const { id } = await params;

  try {
    const doc = await getAdminDb().collection("questions").doc(id).get();
    const data = doc.data();

    await getAdminDb()
      .collection("questions")
      .doc(id)
      .update({
        isActive: false,
        updatedAt: FieldValue.serverTimestamp(),
      });

    // 🔥 decrement question count
    if (data?.bankId) {
      await getAdminDb()
        .collection("questionBanks")
        .doc(data.bankId)
        .update({
          questionCount: FieldValue.increment(-1),
        });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Delete question error:", err);
    return NextResponse.json(
      { error: "Failed to delete question" },
      { status: 500 }
    );
  }
}

