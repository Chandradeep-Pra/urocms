import { NextRequest, NextResponse } from "next/server";
import { getApplePlan } from "@/lib/server/applePlanService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!id || id.includes("/") || id.length > 1500) {
    return NextResponse.json({ error: "Invalid plan ID" }, { status: 400 });
  }
  try {
    const plan = await getApplePlan(id);
    if (!plan) return NextResponse.json({ error: "Apple plan is unavailable" }, { status: 404 });
    return NextResponse.json({ platform: "apple", plan }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Failed to load Apple plan" }, { status: 500 });
  }
}
