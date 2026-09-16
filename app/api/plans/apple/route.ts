import { NextResponse } from "next/server";
import { listApplePlans } from "@/lib/server/applePlanService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    return NextResponse.json({ platform: "apple", plans: await listApplePlans() }, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch {
    return NextResponse.json({ error: "Failed to load Apple plans" }, { status: 500 });
  }
}
