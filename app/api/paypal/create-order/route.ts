import { NextRequest } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { createPayment } from "@/lib/server/paypalPaymentService";
import { limitPaymentRequests, paymentErrorResponse, paymentJson, readPaymentJson } from "@/lib/server/paypalPaymentHttp";
export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  try {
    await limitPaymentRequests(auth.user.uid, "create", 12);
    return paymentJson(await createPayment(auth.user, await readPaymentJson(req)));
  } catch (error) { return paymentErrorResponse(error); }
}
