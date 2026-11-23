import { NextRequest } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { listCustomerPurchases } from "@/lib/server/purchaseService";
import { limitPaymentRequests, paymentErrorResponse, paymentJson } from "@/lib/server/paypalPaymentHttp";
export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  try {
    await limitPaymentRequests(auth.user.uid, "purchases", 60);
    return paymentJson({ purchases: await listCustomerPurchases(auth.user.uid) });
  } catch (error) { return paymentErrorResponse(error); }
}
