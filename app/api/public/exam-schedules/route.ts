import { NextResponse } from "next/server";
import { listExamSchedules } from "@/lib/server/examScheduleService";

export const dynamic = "force-dynamic";

/**
 * Public read-only endpoint — returns upcoming exam schedules (no auth required).
 * Only exposes examName and examDate so candidates can see countdown timers.
 */
export async function GET() {
  try {
    const all = await listExamSchedules();

    // Only expose future or today's exams (strip past ones)
    const today = new Date().toISOString().slice(0, 10);
    const upcoming = all
      .filter((s) => s.examDate >= today)
      .map((s) => ({ id: s.id, examName: s.examName, examDate: s.examDate }));

    return NextResponse.json({ schedules: upcoming }, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60",
      },
    });
  } catch (error) {
    console.error("Public exam schedules error:", error);
    return NextResponse.json({ schedules: [] });
  }
}

