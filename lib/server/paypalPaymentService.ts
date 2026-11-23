import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { amountToMinor, minorToAmount, paymentDate } from "@/lib/paypal-payments";
import { completePurchase, resolvePurchasePricing } from "./purchaseService";
import { capturePayPalOrder, createPayPalOrder, getPayPalCapture, getPayPalOrder, paypalConfig, paypalFetch, PayPalError, type PayPalOrder } from "./paypalService";
import { paymentId } from "./paypalPaymentHttp";
import { sendPurchaseConfirmationEmail } from "./emailService";

type Buyer = { uid: string; email: string | null; name: string | null };
export async function createPayment(buyer: Buyer, body: Record<string, unknown>) {
  const config = paypalConfig();
  if (!buyer.email) throw new PayPalError("SIGN_IN_REQUIRED", 403);
  const planId = paymentId(body.planId, "PLAN"), versionId = paymentId(body.versionId || body.planVersionId, "VERSION");
  const courseId = paymentId(body.courseId, "COURSE"), attemptId = paymentId(body.attemptId, "ATTEMPT");
  if (attemptId.length < 20) throw new PayPalError("INVALID_ATTEMPT", 400);
  if (body.couponCode !== undefined && (typeof body.couponCode !== "string" || body.couponCode.length > 80)) throw new PayPalError("INVALID_COUPON", 400);
  const couponCode = String(body.couponCode || "").trim().toUpperCase();
  const checkoutIntent = body.checkoutIntent === "paylater" ? "paylater" : "paypal";
  const fingerprint = createHash("sha256").update(JSON.stringify([planId, versionId, courseId, couponCode])).digest("hex");
  const id = `p_${createHash("sha256").update(`${config.environment}:${buyer.uid}:${attemptId}`).digest("hex").slice(0, 32)}`;
  const db = getAdminDb(), ref = db.collection("purchases").doc(id);
  let existing = await ref.get();
  if (!existing.exists) {
    let pricing: Awaited<ReturnType<typeof resolvePurchasePricing>>;
    try { pricing = await resolvePurchasePricing({ planId, versionId, courseId, couponCode: couponCode || undefined }); }
    catch (error) { if (error instanceof PayPalError) throw error; throw new PayPalError("PLAN_OR_COUPON_UNAVAILABLE", 400); }
    const amountMinor = amountToMinor(pricing.paidAmount);
    if (amountMinor <= 0) throw new PayPalError("INVALID_PAYMENT_AMOUNT", 400);
    if (checkoutIntent === "paylater" && (!pricing.payLaterEnabled || !config.payLaterEnabled || amountMinor < 2000 || amountMinor > 300000)) throw new PayPalError("PAY_LATER_UNAVAILABLE", 409);
    await db.runTransaction(async tx => {
      if ((await tx.get(ref)).exists) return;
      const now = new Date();
      tx.create(ref, { provider: "paypal", verificationVersion: 3, fingerprint, environment: config.environment, paypalAccountKey: config.accountKey, merchantId: null,
        userId: buyer.uid, userEmail: buyer.email, userName: buyer.name, planId, planVersionId: versionId, courseId,
        planNameSnapshot: pricing.planName, courseNameSnapshot: pricing.courseName, durationMonths: pricing.durationMonths,
        originalAmount: pricing.originalAmount, discountAmount: pricing.discountAmount, taxAmount: pricing.taxAmount, paidAmount: pricing.paidAmount,
        amountMinor, currency: pricing.currency, couponCode: pricing.couponCode, checkoutIntent, financingStatus: "not_available",
        status: "CREATING", paypalOrderId: null, paypalCaptureId: null, purchasedAt: null, accessStartsAt: null, accessEndsAt: null,
        createdAt: now, updatedAt: now, needsReconciliation: true, nextReconcileAt: new Date(Date.now() + 300000) });
    });
    existing = await ref.get();
  }
  const purchase = existing.data()!;
  if (purchase.userId !== buyer.uid || purchase.fingerprint !== fingerprint || purchase.environment !== config.environment
    || (purchase.paypalAccountKey && purchase.paypalAccountKey !== config.accountKey)) throw new PayPalError("PAYMENT_ATTEMPT_MISMATCH", 409);
  if (!["CREATING", "CREATED", "PENDING", "COMPLETED"].includes(purchase.status)) throw new PayPalError("START_NEW_CHECKOUT", 409);
  if (purchase.paypalOrderId) return { orderId: purchase.paypalOrderId, purchaseId: id, amount: purchase.paidAmount, currency: purchase.currency, completed: purchase.status === "COMPLETED" };
  return recoverPaymentOrder(id);
}

export async function recoverPaymentOrder(id: string) {
  const config = paypalConfig(), db = getAdminDb(), ref = db.collection("purchases").doc(paymentId(id));
  const purchase = (await ref.get()).data();
  if (!purchase || purchase.environment !== config.environment || (purchase.paypalAccountKey && purchase.paypalAccountKey !== config.accountKey)) throw new PayPalError("PAYMENT_ACCOUNT_MISMATCH", 409);
  if (purchase.paypalOrderId) return { orderId: purchase.paypalOrderId, purchaseId: id, amount: purchase.paidAmount, currency: purchase.currency, completed: purchase.status === "COMPLETED" };
  if (purchase.status !== "CREATING") throw new PayPalError("PURCHASE_STATE_CONFLICT", 409);
  // Never recreate an unknown order beyond the conservative provider idempotency window.
  if (Date.now() - (paymentDate(purchase.createdAt)?.getTime() || 0) > 5 * 3600000) throw new PayPalError("PAYMENT_REVIEW_REQUIRED", 409);
  const order = await createPayPalOrder({ amount: { currency_code: purchase.currency, value: minorToAmount(purchase.amountMinor) }, purchaseId: id,
    description: `${purchase.courseNameSnapshot} - ${purchase.planNameSnapshot}` });
  paymentId(order.id, "PAYPAL_ORDER");
  // Only trust the recipient returned by PayPal for our server-created order.
  const merchantId = paymentId(order.purchase_units?.[0]?.payee?.merchant_id, "PAYPAL_MERCHANT");
  validatePaymentOrder(order, id, { ...purchase, paypalOrderId: order.id, merchantId: purchase.merchantId || merchantId });
  await db.runTransaction(async tx => {
    const mapRef = db.collection("paypalOrders").doc(order.id);
    const [current, map] = await Promise.all([tx.get(ref), tx.get(mapRef)]);
    if (map.exists && (map.data()?.purchaseId !== id || map.data()?.environment !== config.environment)) throw new PayPalError("PAYMENT_ORDER_MISMATCH", 409);
    if (!current.exists || current.data()?.environment !== config.environment
      || (current.data()?.paypalAccountKey && current.data()?.paypalAccountKey !== config.accountKey)
      || (current.data()?.merchantId && current.data()?.merchantId !== merchantId)
      || (current.data()?.paypalOrderId && current.data()?.paypalOrderId !== order.id)) throw new PayPalError("PAYMENT_ORDER_MISMATCH", 409);
    tx.set(mapRef, { purchaseId: id, userId: purchase.userId, environment: config.environment, createdAt: new Date() });
    tx.update(ref, { paypalOrderId: order.id, paypalAccountKey: config.accountKey, merchantId,
      status: current.data()?.status === "CREATING" ? "CREATED" : current.data()?.status, updatedAt: new Date() });
  });
  return { orderId: order.id, purchaseId: id, amount: purchase.paidAmount, currency: purchase.currency, completed: false };
}

export function validatePaymentOrder(order: PayPalOrder, id: string, purchase: Record<string, unknown>) {
  const config = paypalConfig(), unit = order.purchase_units?.[0];
  if (purchase.environment !== config.environment || (purchase.paypalAccountKey && purchase.paypalAccountKey !== config.accountKey)
    || order.id !== purchase.paypalOrderId || order.purchase_units?.length !== 1
    || !unit || unit.custom_id !== id || unit.reference_id !== id || !purchase.merchantId
    || unit.payee?.merchant_id !== purchase.merchantId) throw new PayPalError("PAYMENT_ORDER_MISMATCH", 409);
  if (!unit.amount || unit.amount.currency_code !== purchase.currency || amountToMinor(unit.amount.value) !== purchase.amountMinor) throw new PayPalError("PAYMENT_AMOUNT_MISMATCH", 409);
  return unit;
}

export async function synchronizePayment(purchaseId: string, captureApproved = false, reversedCaptureId?: string) {
  const db = getAdminDb(), ref = db.collection("purchases").doc(purchaseId), snap = await ref.get(), purchase = snap.data();
  if (!purchase || purchase.provider !== "paypal" || purchase.verificationVersion !== 3) throw new PayPalError("PURCHASE_NOT_FOUND", 404);
  if (purchase.environment !== paypalConfig().environment) throw new PayPalError("PAYMENT_ENVIRONMENT_MISMATCH", 409);
  if (!purchase.paypalOrderId) throw new PayPalError("PAYMENT_CREATION_UNRESOLVED", 409);
  let order = await getPayPalOrder(purchase.paypalOrderId);
  validatePaymentOrder(order, purchaseId, purchase);
  if (captureApproved && order.status === "APPROVED" && ["CREATED", "PENDING"].includes(purchase.status)) {
    order = await capturePayPalOrder(order.id, `c_${purchaseId}`);
    validatePaymentOrder(order, purchaseId, purchase);
  }
  const unit = order.purchase_units![0], captures = unit.payments?.captures || [];
  if (!captures.length) {
    if (order.status === "VOIDED") {
      await db.runTransaction(async tx => {
        const current = (await tx.get(ref)).data()!;
        if (["CREATED", "PENDING"].includes(current.status)) tx.update(ref, { status: "CANCELLED", nextReconcileAt: null, needsReconciliation: false, updatedAt: new Date() });
      });
      return { purchaseId, status: "CANCELLED", pending: false };
    }
    await ref.update({ nextReconcileAt: new Date(Date.now() + 3600000), updatedAt: new Date() });
    return { purchaseId, status: purchase.status, pending: true, approvalRequired: ["CREATED", "SAVED", "PAYER_ACTION_REQUIRED"].includes(order.status) };
  }
  if (captures.length !== 1) throw new PayPalError("PAYMENT_REVIEW_REQUIRED", 409);
  const captureId = paymentId(captures[0].id, "CAPTURE"), capture = await getPayPalCapture(captureId);
  if (capture.id !== captureId || capture.amount?.currency_code !== purchase.currency || amountToMinor(capture.amount.value) !== purchase.amountMinor) throw new PayPalError("PAYMENT_AMOUNT_MISMATCH", 409);
  if (purchase.paypalCaptureId && purchase.paypalCaptureId !== captureId) throw new PayPalError("PAYMENT_ORDER_MISMATCH", 409);
  const now = new Date();
  if (reversedCaptureId) {
    if (capture.id !== reversedCaptureId) throw new PayPalError("PAYMENT_ORDER_MISMATCH", 409);
    await db.runTransaction(async tx => {
      const captureRef = db.collection("paypalCaptures").doc(captureId);
      const [current, mapping] = await Promise.all([tx.get(ref), tx.get(captureRef)]);
      if (mapping.exists && mapping.data()?.purchaseId !== purchaseId) throw new PayPalError("CAPTURE_ALREADY_USED", 409);
      if (current.data()?.paypalCaptureId && current.data()?.paypalCaptureId !== captureId) throw new PayPalError("PAYMENT_ORDER_MISMATCH", 409);
      tx.set(captureRef, { purchaseId, paypalOrderId: order.id, environment: purchase.environment, verifiedAt: now }, { merge: true });
      tx.update(ref, { status: "REVERSED", paypalCaptureId: captureId, reversedAt: now, nextReconcileAt: null, needsReconciliation: false, updatedAt: now });
    });
    return { purchaseId, status: "REVERSED", pending: false };
  }
  if (capture.status === "COMPLETED" && ["CREATED", "PENDING"].includes(purchase.status)) {
    await completePurchase({ purchaseId, paypalOrderId: order.id, paypalCaptureId: capture.id, amount: Number(capture.amount.value), currency: capture.amount.currency_code,
      environment: purchase.environment, merchantId: unit.payee!.merchant_id!, providerPaidAt: capture.create_time || "" });
  } else if (["REFUNDED", "PARTIALLY_REFUNDED"].includes(capture.status)) {
    // Polling is also able to detect refunds when delivery of a webhook was missed.
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data()!;
      tx.update(ref, { ...(capture.status === "REFUNDED" && current.status !== "REVERSED" ? { status: "REFUNDED", refundedMinor: purchase.amountMinor } : {}),
        paypalCaptureId: captureId, refundReviewRequired: capture.status === "PARTIALLY_REFUNDED", verifiedAt: now, updatedAt: now });
    });
  } else if (["DECLINED", "FAILED"].includes(capture.status)) {
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data()!;
      if (["CREATED", "PENDING"].includes(current.status)) tx.update(ref, { status: "FAILED", updatedAt: now });
    });
  } else if (capture.status === "PENDING") {
    await db.runTransaction(async tx => {
      const current = (await tx.get(ref)).data()!;
      if (current.status === "CREATED") tx.update(ref, { status: "PENDING", updatedAt: now });
    });
  }
  const latest = (await ref.get()).data()!;
  const age = Date.now() - (paymentDate(latest.createdAt)?.getTime() || 0);
  const stop = ["REFUNDED", "REVERSED", "FAILED", "CANCELLED"].includes(latest.status) || age > 190 * 86400000;
  await ref.update({ verifiedAt: now, nextReconcileAt: stop ? null : new Date(Date.now() + (latest.status === "COMPLETED" ? 86400000 : 3600000)), needsReconciliation: !stop, updatedAt: now });
  return { purchaseId, status: latest.status, pending: ["CREATED", "PENDING"].includes(latest.status) };
}

export async function capturePayment(uid: string, orderId: string) {
  const map = (await getAdminDb().collection("paypalOrders").doc(orderId).get()).data();
  if (!map || map.userId !== uid) throw new PayPalError("PURCHASE_NOT_FOUND", 404);
  const purchase = (await getAdminDb().collection("purchases").doc(map.purchaseId).get()).data();
  if (purchase?.userId !== uid) throw new PayPalError("PURCHASE_NOT_FOUND", 404);
  const result = await synchronizePayment(map.purchaseId, true);
  if (result.approvalRequired) throw new PayPalError("CHECKOUT_APPROVAL_REQUIRED", 409);
  if (result.status !== "COMPLETED") throw new PayPalError(result.pending ? "PAYMENT_PENDING" : "PAYMENT_NOT_COMPLETED", 409);
  // Receipt delivery is recoverable independently; it cannot undo a verified payment.
  try { await deliverPayPalReceipt(map.purchaseId); } catch { console.warn("paypal_receipt_deferred"); }
  return { success: true, purchaseId: map.purchaseId };
}

export async function processPayPalEvent(eventId: string) {
  const db = getAdminDb(), eventRef = db.collection("paypalEvents").doc(eventId), event = (await eventRef.get()).data();
  if (!event || event.processed || event.environment !== paypalConfig().environment) return;
  const resource = event.resource as Record<string, unknown>, related = (resource.supplementary_data as { related_ids?: { order_id?: string; capture_id?: string } })?.related_ids;
  if (String(event.type).startsWith("CUSTOMER.DISPUTE.")) {
    const transactions = Array.isArray(resource.disputed_transactions) ? resource.disputed_transactions as Array<{ seller_transaction_id?: string }> : [];
    let matched = false;
    for (const transaction of transactions) {
      if (!transaction.seller_transaction_id) continue;
      const map = (await db.collection("paypalCaptures").doc(paymentId(transaction.seller_transaction_id)).get()).data();
      if (!map || map.environment !== event.environment) continue;
      matched = true;
      // Disputes are review signals. Revocation requires a verified refund/reversal.
      await db.collection("purchases").doc(map.purchaseId).update({ disputeId: paymentId(resource.id),
        disputeStatus: String(resource.status || "UNKNOWN").slice(0, 80), disputeReviewRequired: true, updatedAt: new Date() });
    }
    if (!matched) throw new PayPalError("EVENT_PAYMENT_NOT_MAPPED", 503);
    await eventRef.update({ processed: true, processedAt: new Date(), nextAttemptAt: null, lastError: null });
    return;
  }
  let orderId = related?.order_id;
  const captureEvent = String(event.type).startsWith("PAYMENT.CAPTURE.");
  if (!orderId && captureEvent && event.type !== "PAYMENT.CAPTURE.REFUNDED") {
    const map = await db.collection("paypalCaptures").doc(paymentId(resource.id)).get(); orderId = map.data()?.paypalOrderId;
  }
  // Refund notifications expose the capture via related_ids or an authenticated resource link.
  let linkedCapture = related?.capture_id;
  if (!linkedCapture && Array.isArray(resource.links)) {
    for (const link of resource.links as Array<{ rel?: string; href?: string }>) {
      if (link.rel !== "up" || !link.href) continue;
      try {
        const url = new URL(link.href), origins = event.environment === "live"
          ? ["https://api-m.paypal.com", "https://api.paypal.com"] : ["https://api-m.sandbox.paypal.com", "https://api.sandbox.paypal.com"];
        if (origins.includes(url.origin)) linkedCapture = /^\/v2\/payments\/captures\/([A-Z0-9]+)$/.exec(url.pathname)?.[1];
      } catch { /* not a capture link */ }
    }
  }
  if (!orderId && linkedCapture) orderId = (await db.collection("paypalCaptures").doc(paymentId(linkedCapture)).get()).data()?.paypalOrderId;
  if (String(event.type).startsWith("CHECKOUT.ORDER.")) orderId = paymentId(resource.id);
  const orderMap = orderId ? (await db.collection("paypalOrders").doc(paymentId(orderId)).get()).data() : null;
  // An order-created event can arrive before the order mapping is committed: retry it.
  if (!orderMap || orderMap.environment !== event.environment) throw new PayPalError("EVENT_PAYMENT_NOT_MAPPED", 503);
  const purchaseId = paymentId(orderMap.purchaseId), ref = db.collection("purchases").doc(purchaseId);
  await synchronizePayment(purchaseId, event.type === "CHECKOUT.ORDER.APPROVED", event.type === "PAYMENT.CAPTURE.REVERSED" ? paymentId(resource.id) : undefined);
  if (event.type === "PAYMENT.CAPTURE.REFUNDED") {
    const refundId = paymentId(resource.id, "REFUND");
    const refund = await paypalFetch<{ id: string; status: string; amount: { value: string; currency_code: string }; create_time?: string }>(`/v2/payments/refunds/${encodeURIComponent(refundId)}`);
    if (refund.id !== refundId || refund.status !== "COMPLETED") throw new PayPalError("REFUND_PENDING", 503);
    const refundRef = db.collection("paypalRefunds").doc(`${event.environment}_${refundId}`);
    await db.runTransaction(async tx => {
      const [purchaseSnap, prior] = await Promise.all([tx.get(ref), tx.get(refundRef)]), current = purchaseSnap.data()!;
      if (prior.exists) return;
      if (refund.amount.currency_code !== current.currency) throw new PayPalError("PAYMENT_AMOUNT_MISMATCH", 409);
      const amountMinor = amountToMinor(refund.amount.value);
      const total = Math.min(current.amountMinor, Number(current.refundedMinor || 0) + amountMinor);
      tx.create(refundRef, { refundId, purchaseId, amountMinor, currency: current.currency, environment: event.environment, providerCreatedAt: refund.create_time || null, verifiedAt: new Date() });
      tx.update(ref, { refundedMinor: total, refundReviewRequired: total < current.amountMinor,
        ...(total === current.amountMinor && current.status !== "REVERSED" ? { status: "REFUNDED" } : {}), updatedAt: new Date() });
    });
  }
  await eventRef.update({ processed: true, processedAt: new Date(), nextAttemptAt: null, lastError: null });
}

/** Mail is at-least-once after a crash during SMTP; payment/access fulfillment remains exactly once. */
export async function deliverPayPalReceipt(purchaseId: string) {
  const db = getAdminDb(), ref = db.collection("paypalMailOutbox").doc(purchaseId), token = randomUUID();
  const purchase = (await db.collection("purchases").doc(purchaseId).get()).data();
  if (!purchase || purchase.environment !== paypalConfig().environment) return;
  const claimed = await db.runTransaction(async tx => {
    const snap = await tx.get(ref), data = snap.data();
    if (!data || data.status === "SENT" || (paymentDate(data.leaseUntil)?.getTime() || 0) > Date.now()) return false;
    tx.update(ref, { leaseToken: token, leaseUntil: new Date(Date.now() + 120000), nextAttemptAt: new Date(Date.now() + 300000) }); return true;
  });
  if (!claimed) return;
  try {
    if (purchase?.status === "COMPLETED" && purchase.userEmail) await sendPurchaseConfirmationEmail({ to: purchase.userEmail, name: purchase.userName || "",
      courseName: purchase.courseNameSnapshot, planName: purchase.planNameSnapshot, amount: purchase.paidAmount, currency: "GBP",
      orderReference: purchase.paypalOrderId, captureReference: purchase.paypalCaptureId, purchaseDate: paymentDate(purchase.purchasedAt)!, accessEndsAt: paymentDate(purchase.accessEndsAt)! });
    await ref.update({ status: "SENT", sentAt: new Date(), leaseUntil: null, nextAttemptAt: null });
  } catch (error) { await ref.update({ leaseUntil: null, nextAttemptAt: new Date(Date.now() + 300000) }); throw error; }
}
