import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  createPricingCoupon,
  loadPricingAdminData,
  parsePricingCouponInput,
  validatePricingCouponInput,
} from "@/lib/server/pricingService";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await loadPricingAdminData();
    return NextResponse.json({ coupons: data.coupons });
  } catch (error) {
    console.error("Pricing coupons fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const input = parsePricingCouponInput(await req.json());
    const validationError = validatePricingCouponInput(input);

    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const id = await createPricingCoupon(input);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    if (error instanceof Error && error.message === "Coupon code already exists") {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    console.error("Pricing coupon create error:", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
