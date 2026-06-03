import { NextResponse } from "next/server";
import { getMockDetails } from "@/lib/server/mockService";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const mock = await getMockDetails(id);

    if (mock.accessType !== "public") {
      return NextResponse.json(
        { error: "This mock is not publicly available." },
        { status: 404 }
      );
    }

    return NextResponse.json({ mock });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch public mock";
    const status = message === "Mock not found" ? 404 : 500;
    console.error("Public mock fetch error:", error);
    return NextResponse.json({ error: message }, { status });
  }
}
