import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  deletePricingPlan,
  parsePricingPlanInput,
  updatePricingPlan,
  validatePricingPlanInput,
} from "@/lib/server/pricingService";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await params;
    const input = parsePricingPlanInput(await req.json());
    const validationError = validatePricingPlanInput(input);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    await updatePricingPlan(id, input);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pricing plan update error:", error);
    return NextResponse.json({ error: "Failed to update pricing plan" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await params;
    await deletePricingPlan(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pricing plan delete error:", error);
    return NextResponse.json({ error: "Failed to delete pricing plan" }, { status: 500 });
  }
}
