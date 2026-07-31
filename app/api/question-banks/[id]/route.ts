//@ts-ignore

import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "@/lib/server/adminAccess";

/* ───────── UPDATE BANK ───────── */

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    const { title, section } = await req.json();
    const normalizedTitle = typeof title === "string" ? title.trim() : "";
    const normalizedSection = typeof section === "string" ? section.trim() : "";
    const updates: Record<string, unknown> = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (title !== undefined) {
      if (!normalizedTitle) {
        return NextResponse.json(
          { error: "Title cannot be empty" },
          { status: 400 }
        );
      }
      updates.title = normalizedTitle;
    }

    if (section !== undefined) {
      if (!["section1", "section2"].includes(normalizedSection)) {
        return NextResponse.json(
          { error: "Invalid section selected" },
          { status: 400 }
        );
      }
      updates.section = normalizedSection;
    }

    await getAdminDb()
      .collection("questionBanks")
      .doc(id)
      .update(updates);

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
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;

    if (!id) {
      return NextResponse.json(
        { error: "Invalid ID" },
        { status: 400 }
      );
    }

    await getAdminDb()
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
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;

    const doc = await getAdminDb()
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
