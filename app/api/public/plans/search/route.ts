import { NextRequest, NextResponse } from "next/server";
import { discoverPlansForQuery } from "@/lib/server/planDiscoveryService";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const query = String(body?.query || "").trim();
    const requestedLimit = Number(body?.limit || 5);

    if (query.length < 3) {
      return NextResponse.json({ error: "query must contain at least 3 characters" }, { status: 400 });
    }
    if (query.length > 500) {
      return NextResponse.json({ error: "query must not exceed 500 characters" }, { status: 400 });
    }

    const limit = Number.isFinite(requestedLimit)
      ? Math.min(10, Math.max(1, Math.floor(requestedLimit)))
      : 5;
    const result = await discoverPlansForQuery(query, limit);
    return NextResponse.json(result, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" },
    });
  } catch (error) {
    console.error("Public plan discovery error:", error);
    return NextResponse.json({ error: "Failed to search plans" }, { status: 500 });
  }
}
