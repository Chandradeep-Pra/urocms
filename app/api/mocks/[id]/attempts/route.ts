import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { addAdminMockAttempt } from "@/lib/server/mockService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    const result = await addAdminMockAttempt(id, await req.json());
    return NextResponse.json({
      success: true,
      attemptsCount: result.attemptsCount,
      attempt: result.attempt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit mock attempt";
    const status =
      message === "Mock not found"
        ? 404
        : message === "Name, email and marks are required"
          ? 400
          : 500;
    console.error("Mock attempt submit error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
