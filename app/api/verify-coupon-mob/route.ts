import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json(
    { message: "Coupon not verified" },
    { status: 400 },
  );
}
