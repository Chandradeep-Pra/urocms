import { NextRequest } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { resolvePurchasePricing } from "@/lib/server/purchaseService";
import { amountToMinor } from "@/lib/paypal-payments";
import { paypalPublicConfig, PayPalError } from "@/lib/server/paypalService";
import { limitPaymentRequests, paymentErrorResponse, paymentId, paymentJson, readPaymentJson } from "@/lib/server/paypalPaymentHttp";
export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  try {
    await limitPaymentRequests(auth.user.uid, "quote", 40);
    const body = await readPaymentJson(req);
    if (body.couponCode !== undefined && (typeof body.couponCode !== "string" || body.couponCode.length > 80)) throw new PayPalError("INVALID_COUPON", 400);
    const pricing = await resolvePurchasePricing({ planId: paymentId(body.planId), versionId: paymentId(body.versionId), courseId: paymentId(body.courseId), couponCode: body.couponCode as string | undefined });
    const amountMinor = amountToMinor(pricing.paidAmount), config = paypalPublicConfig();
    return paymentJson({ originalAmount: pricing.originalAmount, discountAmount: pricing.discountAmount, taxAmount: pricing.taxAmount,
      total: pricing.paidAmount, amountMinor, currency: pricing.currency, payLaterEligible: config.payLaterEnabled && pricing.payLaterEnabled && amountMinor >= 2000 && amountMinor <= 300000 });
  } catch (error) { return paymentErrorResponse(error); }
}
