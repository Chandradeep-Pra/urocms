import { NextRequest, NextResponse } from "next/server";
import { getPublicMockResults } from "@/lib/server/mockService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const results = await getPublicMockResults(id);
    return NextResponse.json(results, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch mock results";
    const status =
      message === "Mock not found" || message === "Mock is not publicly available"
        ? 404
        : 500;
    if (status === 500) console.error("Public mock results error:", error);
    return NextResponse.json(
      { error: message },
      {
        status,
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
          Pragma: "no-cache",
          Expires: "0",
        },
      }
    );
  }
}
