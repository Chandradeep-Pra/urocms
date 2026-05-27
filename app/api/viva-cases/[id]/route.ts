// app/api/viva-cases/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { requireAppUser } from "@/lib/server/appSession";
import { canAccessViva } from "@/lib/appAccess";
import {
  canAccessVivaCaseFromCourseIds,
  getVivaCaseById,
  getPublicVivaCaseById,
  softDeleteVivaCase,
  updateVivaCase,
} from "@/lib/server/vivaService";

/* ───────── GET SINGLE ───────── */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  const admin = await requireAdminSession(req);
  if (!admin.response) {
    try {
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

  const appAuth = await requireAppUser(req);
  if ("response" in appAuth) return appAuth.response;

  try {
    const publicCase = await getPublicVivaCaseById(id).catch(() => null);

    const allowed =
      Boolean(publicCase) ||
      canAccessViva(appAuth.user.tier) ||
      (await canAccessVivaCaseFromCourseIds(id, appAuth.user.activeCourseIds));
    if (!allowed) {
      return NextResponse.json(
        { error: "Viva case is not included in your current courses" },
        { status: 403 }
      );
    }

    return NextResponse.json({
      case: publicCase ?? (await getVivaCaseById(id)),
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

  } catch {
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

  } catch {
    return NextResponse.json(
      { error: "Failed to delete case" },
      { status: 500 }
    );
  }
}
