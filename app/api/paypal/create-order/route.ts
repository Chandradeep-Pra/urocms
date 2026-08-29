import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";
import { createPayPalOrder, PayPalError } from "@/lib/server/paypalService";
import { resolvePurchasePricing } from "@/lib/server/purchaseService";

export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  try {
    const body = await req.json();
    const pricing = await resolvePurchasePricing({ planId: String(body.planId || ""), versionId: String(body.versionId || body.planVersionId || ""), courseId: String(body.courseId || ""), couponCode: body.couponCode ? String(body.couponCode) : undefined });
    const purchaseRef = getAdminDb().collection("purchases").doc();
    const order = await createPayPalOrder({ amount: { currency_code: pricing.currency, value: pricing.paidAmount.toFixed(2) }, purchaseId: purchaseRef.id, description: `${pricing.courseName} - ${pricing.planName}` });
    if (!order.id) throw new Error("PayPal did not return an order ID");
    const now = new Date();
    const batch = getAdminDb().batch();
    batch.create(purchaseRef, { userId: auth.user.uid, userEmail: auth.user.email, userName: auth.user.name, courseId: pricing.courseId, planId: pricing.planId, planVersionId: pricing.versionId, courseNameSnapshot: pricing.courseName, planNameSnapshot: pricing.planName, durationMonths: pricing.durationMonths, couponCode: pricing.couponCode, paypalOrderId: String(order.id), paypalCaptureId: null, originalAmount: pricing.originalAmount, discountAmount: pricing.discountAmount, taxAmount: pricing.taxAmount, paidAmount: pricing.paidAmount, currency: pricing.currency, status: "CREATED", purchasedAt: null, accessStartsAt: null, accessEndsAt: null, emailSentAt: null, createdAt: now, updatedAt: now });
    batch.create(getAdminDb().collection("paypalOrders").doc(String(order.id)), { purchaseId: purchaseRef.id, userId: auth.user.uid, createdAt: now });
    await batch.commit();
    return NextResponse.json({ orderId: String(order.id), purchaseId: purchaseRef.id, amount: pricing.paidAmount, currency: pricing.currency, paypalClientId: process.env.PAYPAL_CLIENT_ID?.trim() || "" });
  } catch (error) {
    console.error("PayPal create order failed", { error: error instanceof Error ? error.message : "unknown" });
    const status = error instanceof PayPalError ? error.status : 400;
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to create payment" }, { status });
  }
}
