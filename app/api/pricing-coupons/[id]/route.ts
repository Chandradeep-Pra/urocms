import { NextRequest, NextResponse } from "next/server";
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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pricing coupon update error:", error);
    return NextResponse.json({ error: "Failed to update coupon" }, { status: 500 });
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
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Pricing coupon delete error:", error);
    return NextResponse.json({ error: "Failed to delete coupon" }, { status: 500 });
  }
}
