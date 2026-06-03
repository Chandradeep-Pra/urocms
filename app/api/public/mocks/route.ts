import { NextResponse } from "next/server";
import { listMocks } from "@/lib/server/mockService";

export async function GET() {
  try {
    const mocks = (await listMocks()).filter((mock) => mock.accessType === "public");
    return NextResponse.json({ mocks });
  } catch (error) {
    console.error("Public mocks fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch public mocks" },
      { status: 500 }
    );
  }
}
