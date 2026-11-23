import { NextRequest } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { listCustomerPurchases } from "@/lib/server/purchaseService";
import { limitPaymentRequests, paymentErrorResponse, paymentId, paymentJson } from "@/lib/server/paypalPaymentHttp";
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  try {
    await limitPaymentRequests(auth.user.uid, "purchase", 60);
    const id = paymentId((await context.params).id), purchase = (await listCustomerPurchases(auth.user.uid)).find(p => p.id === id);
    return purchase ? paymentJson({ purchase }) : paymentJson({ error: "Purchase not found" }, 404);
  } catch (error) { return paymentErrorResponse(error); }
}
