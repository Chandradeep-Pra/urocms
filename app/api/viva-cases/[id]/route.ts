// app/api/viva-cases/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { requireAdminSession } from "@/lib/server/adminAccess";

/* ───────── GET SINGLE ───────── */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;

    const doc = await adminDb.collection("vivaCases").doc(id).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: "Case not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      case: {
        id: doc.id,
        ...doc.data(),
      },
    });

  } catch (err) {
    return NextResponse.json(
      { error: "Failed to fetch case" },
      { status: 500 }
    );
  }
}

/* ───────── UPDATE ───────── */
export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    const body = await req.json();

    const nextFolderId = typeof body.folderId === "string" ? body.folderId : undefined;
    const nextFolderName = typeof body.folderName === "string" ? body.folderName : undefined;

    await adminDb.collection("vivaCases").doc(id).update({
      ...body,
      ...(nextFolderId !== undefined ? { folderId: nextFolderId } : {}),
      ...(nextFolderName !== undefined ? { folderName: nextFolderName } : {}),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json(
      { error: "Failed to update case" },
      { status: 500 }
    );
  }
}

/* ───────── DELETE (SOFT) ───────── */
export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;

    await adminDb.collection("vivaCases").doc(id).update({
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete case" },
      { status: 500 }
    );
  }
}
