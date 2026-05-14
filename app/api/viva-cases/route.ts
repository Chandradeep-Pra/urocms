// app/api/viva-cases/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { createVivaCase, listVivaCases } from "@/lib/server/vivaService";

/* ───────── GET ALL CASES ───────── */
export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    return NextResponse.json({ cases: await listVivaCases() });
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Failed to fetch cases" },
      { status: 500 }
    );
  }
}

/* ───────── CREATE CASE ───────── */
export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const result = await createVivaCase(await req.json());
    return NextResponse.json({
      success: true,
      id: result.id,
    });

  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create case";
    console.error(err);
    return NextResponse.json(
      { error: message },
      { status: message === "Title & stem required" ? 400 : 500 }
    );
  }
} 
