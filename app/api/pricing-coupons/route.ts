import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("pricingCoupons").orderBy("updatedAt", "desc").get();
    const coupons = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ coupons });
  } catch (error) {
    console.error("Pricing coupons fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch coupons" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const code = String(body.code ?? "").trim().toUpperCase();
    const description = String(body.description ?? "").trim();
    const discountType = body.discountType === "amount" ? "amount" : "percent";
    const discountValue = Number(body.discountValue ?? 0);
    const startsAt = body.startsAt ? String(body.startsAt) : null;
    const endsAt = body.endsAt ? String(body.endsAt) : null;

    if (!code) {
      return NextResponse.json({ error: "Coupon code is required" }, { status: 400 });
    }

    if (!Number.isFinite(discountValue) || discountValue <= 0) {
      return NextResponse.json({ error: "Discount value must be greater than 0" }, { status: 400 });
    }

    const existing = await adminDb.collection("pricingCoupons").where("code", "==", code).limit(1).get();
    if (!existing.empty) {
      return NextResponse.json({ error: "Coupon code already exists" }, { status: 400 });
    }

    const docRef = await adminDb.collection("pricingCoupons").add({
      code,
      description,
      discountType,
      discountValue,
      startsAt,
      endsAt,
      isActive: body.isActive !== false,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("Pricing coupon create error:", error);
    return NextResponse.json({ error: "Failed to create coupon" }, { status: 500 });
  }
}
