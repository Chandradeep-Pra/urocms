import { NextRequest, NextResponse } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { verifyAndFulfillApplePurchase } from "@/lib/server/applePlanService";
import { isProductId, isTransactionId, ApplePaymentError } from "@/lib/server/appleStoreServer";
import { readAppleJson, limitAppleRequests, appleErrorResponse } from "@/lib/server/applePaymentHttp";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;
  if (!auth.user.email) return NextResponse.json({ error: "Sign in to purchase." }, { status: 403 });
  try {
    await limitAppleRequests(auth.user.uid, "verify");
    const body = await readAppleJson(req);
    if (!isProductId(body.productId) || !isTransactionId(body.transactionId)) throw new ApplePaymentError("INVALID_PURCHASE", 400);
    const result = await verifyAndFulfillApplePurchase({ userId: auth.user.uid, userEmail: auth.user.email,
      userName: auth.user.name, productId: body.productId, transactionId: body.transactionId });
    return NextResponse.json({ success: true, alreadyCompleted: result.alreadyCompleted, planId: result.planId, accessEndsAt: result.accessEndsAt },
      { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return appleErrorResponse(error); }
}
