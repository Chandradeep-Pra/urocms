import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { verifyPayPalWebhook } from "@/lib/server/paypalService";
import { completePurchase } from "@/lib/server/purchaseService";

export async function POST(req: NextRequest) {
  try {
    const event = await req.json();
    if (!(await verifyPayPalWebhook(req.headers, event))) return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
    const type = String(event.event_type || ""); const resource = event.resource || {};
    const orderId = String(resource.supplementary_data?.related_ids?.order_id || "");
    const eventRef = getAdminDb().collection("paypalWebhookEvents").doc(String(event.id || "missing"));
    if ((await eventRef.get()).exists) return NextResponse.json({ received: true, duplicate: true });
    if (orderId && ["PAYMENT.CAPTURE.COMPLETED", "PAYMENT.CAPTURE.DENIED", "PAYMENT.CAPTURE.REFUNDED"].includes(type)) {
      const snap = await getAdminDb().collection("purchases").where("paypalOrderId", "==", orderId).limit(1).get();
      if (!snap.empty) {
        const doc = snap.docs[0];
        if (type === "PAYMENT.CAPTURE.COMPLETED") await completePurchase({ purchaseId: doc.id, paypalOrderId: orderId, paypalCaptureId: String(resource.id), amount: Number(resource.amount?.value), currency: String(resource.amount?.currency_code) });
        else {
          const purchase = doc.data();
          const status = type.endsWith("REFUNDED") ? "REFUNDED" : "FAILED";
          const db = getAdminDb();
          const entitlementRef = db.collection("courseEntitlements").doc(`${purchase.userId}_${purchase.courseId}`);
          await db.runTransaction(async (tx) => {
            const entitlement = await tx.get(entitlementRef);
            tx.set(doc.ref, { status, paypalCaptureId: String(resource.id || ""), updatedAt: new Date() }, { merge: true });
            // A refund for an older purchase must not revoke a later renewal.
            if (entitlement.data()?.purchaseId === doc.id) {
              tx.set(entitlementRef, { status, updatedAt: new Date() }, { merge: true });
              if (status === "REFUNDED") tx.set(db.collection("users").doc(String(purchase.userId)), { activePlanStatus: "expired", updatedAt: new Date().toISOString() }, { merge: true });
            }
          });
        }
      }
    }
    await eventRef.set({ eventType: type, resourceId: String(resource.id || ""), receivedAt: new Date() });
    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("PayPal webhook failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
