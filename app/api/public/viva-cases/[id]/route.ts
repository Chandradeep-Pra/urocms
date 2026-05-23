import { NextRequest, NextResponse } from "next/server";
import { getPublicVivaCaseById } from "@/lib/server/vivaService";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const vivaCase = await getPublicVivaCaseById(id);

    const {
      allowedUser,
      courseAllowedUserMap,
      attempts,
      publicParticipants,
      attemptsCount,
      ...safeCase
    } = vivaCase as Record<string, unknown>;

    return NextResponse.json({
      case: safeCase,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch case";
    return NextResponse.json(
      { error: message },
      { status: message === "Case not found" ? 404 : 500 }
    );
  }
}
