import { NextRequest } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { capturePayment } from "@/lib/server/paypalPaymentService";
import { limitPaymentRequests, paymentErrorResponse, paymentId, paymentJson, readPaymentJson } from "@/lib/server/paypalPaymentHttp";
export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  try {
    await limitPaymentRequests(auth.user.uid, "capture", 20);
    const body = await readPaymentJson(req);
    return paymentJson(await capturePayment(auth.user.uid, paymentId(body.orderId, "PAYPAL_ORDER")));
  } catch (error) { return paymentErrorResponse(error); }
}
