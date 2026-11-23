import { getAdminDb } from "@/lib/firebaseAdmin";
import { deliverPayPalReceipt, processPayPalEvent, recoverPaymentOrder, synchronizePayment } from "@/lib/server/paypalPaymentService";
import { paypalConfig } from "@/lib/server/paypalService";
import { internalPaymentAuthorized, paymentErrorResponse, paymentJson } from "@/lib/server/paypalPaymentHttp";
export async function POST(req: Request) {
  if (!internalPaymentAuthorized(req)) return paymentJson({ error: "Unauthorized" }, 401);
  try {
    const db = getAdminDb(), now = new Date(), config = paypalConfig();
    let succeeded = 0, deferred = 0;
    const payments = await db.collection("purchases").where("nextReconcileAt", "<=", now).orderBy("nextReconcileAt").limit(20).get();
    for (const doc of payments.docs) {
      const data = doc.data(); if (data.environment !== config.environment || data.provider !== "paypal") continue;
      try {
        if (!data.paypalOrderId && data.status === "CREATING") {
          await recoverPaymentOrder(doc.id);
          succeeded++; continue;
        }
        await synchronizePayment(doc.id, true); succeeded++;
      } catch { await doc.ref.update({ nextReconcileAt: new Date(Date.now() + 3600000), reviewRequired: true }); deferred++; }
    }
    const events = await db.collection("paypalEvents").where("nextAttemptAt", "<=", now).orderBy("nextAttemptAt").limit(20).get();
    for (const event of events.docs) {
      if (event.data().environment !== config.environment) continue;
      try { await processPayPalEvent(event.id); succeeded++; }
      catch { const attempts = Number(event.data().attempts || 0) + 1; await event.ref.update({ attempts, lastError: "RETRY_REQUIRED", nextAttemptAt: new Date(Date.now() + Math.min(3600000, 60000 * 2 ** Math.min(attempts, 6))) }); deferred++; }
    }
    const mail = await db.collection("paypalMailOutbox").where("nextAttemptAt", "<=", now).orderBy("nextAttemptAt").limit(10).get();
    for (const item of mail.docs) { try { await deliverPayPalReceipt(item.id); succeeded++; } catch { deferred++; } }
    return paymentJson({ succeeded, deferred });
  } catch (error) { return paymentErrorResponse(error); }
}
