// app/api/viva-cases/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  getVivaCaseById,
  softDeleteVivaCase,
  updateVivaCase,
} from "@/lib/server/vivaService";

/* ───────── GET SINGLE ───────── */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    return NextResponse.json({
      case: await getVivaCaseById(id),
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch case";
    return NextResponse.json(
      { error: message },
      { status: message === "Case not found" ? 404 : 500 }
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
    return NextResponse.json(await updateVivaCase(id, await req.json()));

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
    return NextResponse.json(await softDeleteVivaCase(id));

  } catch (err) {
    return NextResponse.json(
      { error: "Failed to delete case" },
      { status: 500 }
    );
  }
}
