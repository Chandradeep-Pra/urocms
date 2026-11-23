import { getAdminDb } from "@/lib/firebaseAdmin";
import { paypalConfig, verifyPayPalWebhook } from "@/lib/server/paypalService";
import { paymentErrorResponse, paymentId, paymentJson, readPaymentJson } from "@/lib/server/paypalPaymentHttp";
import { processPayPalEvent } from "@/lib/server/paypalPaymentService";

const accepted = new Set(["CHECKOUT.ORDER.APPROVED", "PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.PENDING", "PAYMENT.CAPTURE.DECLINED",
  "PAYMENT.CAPTURE.REFUNDED", "PAYMENT.CAPTURE.REVERSED", "CUSTOMER.DISPUTE.CREATED", "CUSTOMER.DISPUTE.UPDATED", "CUSTOMER.DISPUTE.RESOLVED"]);
export async function POST(req: Request) {
  try {
    const event = await readPaymentJson(req, 262144);
    await verifyPayPalWebhook(req.headers, event);
    const id = paymentId(event.id, "EVENT"), environment = paypalConfig().environment;
    if (!accepted.has(String(event.event_type))) return paymentJson({ received: true, ignored: true });
    const ref = getAdminDb().collection("paypalEvents").doc(`${environment}_${id}`);
    await getAdminDb().runTransaction(async tx => {
      if ((await tx.get(ref)).exists) return;
      // Persist only the necessary authenticated resource, not payer/card/contact data.
      const raw = event.resource && typeof event.resource === "object" ? event.resource as Record<string, unknown> : {};
      const related = (raw.supplementary_data as { related_ids?: { order_id?: string; capture_id?: string } } | undefined)?.related_ids;
      const resource = { id: raw.id || null, supplementary_data: { related_ids: { order_id: related?.order_id || null, capture_id: related?.capture_id || null } },
        links: Array.isArray(raw.links) ? raw.links.map((link: { rel?: string; href?: string }) => ({ rel: link.rel || "", href: link.href || "" })) : [],
        disputed_transactions: Array.isArray(raw.disputed_transactions) ? raw.disputed_transactions.map((item: { seller_transaction_id?: string }) => ({ seller_transaction_id: item.seller_transaction_id || null })) : [],
        status: typeof raw.status === "string" ? raw.status.slice(0, 80) : null };
      tx.create(ref, { eventId: id, environment, type: event.event_type, resource, providerCreatedAt: event.create_time || null,
        receivedAt: new Date(), processed: false, attempts: 0, nextAttemptAt: new Date() });
    });
    try { await processPayPalEvent(ref.id); }
    catch { await ref.update({ lastError: "PROCESSING_DEFERRED", nextAttemptAt: new Date(Date.now() + 60000) }); }
    // Durable inbox + scheduled retries: a receipt does not imply successful processing.
    return paymentJson({ received: true });
  } catch (error) { return paymentErrorResponse(error); }
}
