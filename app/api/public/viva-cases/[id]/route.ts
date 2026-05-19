import { NextRequest, NextResponse } from "next/server";
import { getVivaCaseById, isTrialVivaCase } from "@/lib/server/vivaService";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const vivaCase = await getVivaCaseById(id);

    if (!isTrialVivaCase(vivaCase)) {
      return NextResponse.json({ error: "Trial case not found" }, { status: 404 });
    }

    return NextResponse.json({ case: vivaCase });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch trial case";
    return NextResponse.json(
      { error: message === "Case not found" ? "Trial case not found" : message },
      { status: message === "Case not found" ? 404 : 500 }
    );
  }
}
