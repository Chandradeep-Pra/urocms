import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  updateExamSchedule,
  deleteExamSchedule,
} from "@/lib/server/examScheduleService";

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    const body = await req.json();
    const schedule = await updateExamSchedule(id, body);
    return NextResponse.json({ success: true, schedule });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update exam schedule";
    return NextResponse.json(
      { error: message },
      {
        status: message.toLowerCase().includes("not found")
          ? 404
          : message.toLowerCase().includes("required")
          ? 400
          : 500,
      }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    return NextResponse.json(await deleteExamSchedule(id));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete exam schedule";
    return NextResponse.json(
      { error: message },
      { status: message.toLowerCase().includes("not found") ? 404 : 500 }
    );
  }
}

