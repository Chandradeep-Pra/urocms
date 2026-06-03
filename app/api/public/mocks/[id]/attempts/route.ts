import { NextRequest, NextResponse } from "next/server";
import { addPublicMockAttempt } from "@/lib/server/mockService";

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const result = await addPublicMockAttempt(id, await req.json());
    return NextResponse.json({
      success: true,
      attemptsCount: result.attemptsCount,
      attempt: result.attempt,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to submit public mock attempt";
    const status =
      message === "Mock not found"
        ? 404
        : message === "Mock is not publicly available"
          ? 404
          : message === "Name, email and marks are required"
            ? 400
            : 500;
    console.error("Public mock attempt submit error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
