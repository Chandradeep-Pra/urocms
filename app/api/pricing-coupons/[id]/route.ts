import { NextRequest, NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { deletePricingCoupon, updatePricingCouponStatus } from "@/lib/server/pricingService";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const { id } = await params;
    const body = await req.json();

    await updatePricingCouponStatus(id, body.isActive !== false);
    revalidatePath("/pricing");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pricing coupon update error:", error);
    const message = error instanceof Error ? error.message : "Failed to update coupon";
    return NextResponse.json({ error: message }, { status: 500 });
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
    await deletePricingCoupon(id);
    revalidatePath("/pricing");
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pricing coupon delete error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete coupon";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
