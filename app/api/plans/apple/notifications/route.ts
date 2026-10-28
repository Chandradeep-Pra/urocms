import { NextRequest, NextResponse } from "next/server";
import { processAppleNotification } from "@/lib/server/applePurchaseLedger";
import { readAppleJson, appleErrorResponse } from "@/lib/server/applePaymentHttp";
import { ApplePaymentError } from "@/lib/server/appleStoreServer";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Apple cannot send our Firebase bearer token. Authenticate the signed Apple notification instead.
export async function POST(req: NextRequest) {
  try {
    const body = await readAppleJson(req, 131072);
    if (typeof body.signedPayload !== "string" || body.signedPayload.length > 120000 || body.signedPayload.split(".").length !== 3) throw new ApplePaymentError("INVALID_APPLE_NOTIFICATION", 400);
    await processAppleNotification(body.signedPayload);
    return NextResponse.json({ received: true }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return appleErrorResponse(error); }
}
