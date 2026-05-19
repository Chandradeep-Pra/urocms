import { NextResponse } from "next/server";
import { listTrialVivaCases } from "@/lib/server/vivaService";

export async function GET() {
  try {
    const cases = await listTrialVivaCases();
    return NextResponse.json({ cases });
  } catch (error) {
    console.error("Public trial viva cases fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch trial cases" }, { status: 500 });
  }
}
