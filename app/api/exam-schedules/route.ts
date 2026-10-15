import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  createExamSchedule,
  listExamSchedules,
} from "@/lib/server/examScheduleService";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const schedules = await listExamSchedules();
    return NextResponse.json({ schedules });
  } catch (error) {
    console.error("Exam schedules GET error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam schedules" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const body = await req.json();
    const schedule = await createExamSchedule(body);
    return NextResponse.json({ success: true, schedule }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create exam schedule";
    return NextResponse.json(
      { error: message },
      { status: message.toLowerCase().includes("required") ? 400 : 500 }
    );
  }
}

