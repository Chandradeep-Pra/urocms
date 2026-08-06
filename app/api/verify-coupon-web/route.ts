import { NextRequest, NextResponse } from "next/server";
import {
  couponFailureResponse,
  verifyPlanCoupon,
} from "@/lib/server/couponVerificationService";

export async function POST(req: NextRequest) {
  try {
    return NextResponse.json(await verifyPlanCoupon(await req.json(), "web"));
  } catch (error) {
    const failure = couponFailureResponse(error, "/api/payment-queries");
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
