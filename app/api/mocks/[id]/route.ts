import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  deleteMockSchedule,
  getMockDetails,
  updateMockSchedule,
} from "@/lib/server/mockService";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    return NextResponse.json({
      mock: await getMockDetails(id),
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load mock";
    const status = message === "Mock not found" || message === "Quiz not found" ? 404 : 500;
    console.error("Mock fetch error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    await updateMockSchedule(id, await req.json());
    return NextResponse.json({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to update mock";
    const status =
      message === "Mock not found" || message === "Quiz not found"
        ? 404
        : message === "Only mock type quizzes can be linked"
          ? 400
          : 500;
    console.error("Update mock error:", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await context.params;
    return NextResponse.json(await deleteMockSchedule(id));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to delete mock";
    console.error("Delete mock error:", err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
