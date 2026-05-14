import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { createMockSchedule, listMocks } from "@/lib/server/mockService";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const mocks = await listMocks();
    return NextResponse.json({ mocks });
  } catch (err) {
    console.error("Fetch mocks error:", err);

    return NextResponse.json(
      { error: "Failed to fetch mocks" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const result = await createMockSchedule(await req.json());
    return NextResponse.json({
      success: true,
      id: result.id,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to create mock";
    const status =
      message === "Quiz not found"
        ? 404
        : message === "Quiz and start time required" ||
            message === "Only mock type quizzes can be linked"
          ? 400
          : 500;
    console.error("Create mock error:", err);

    return NextResponse.json({ error: message }, { status });
  }
}
