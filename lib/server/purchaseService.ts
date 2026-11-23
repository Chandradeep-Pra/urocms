import { Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { amountToMinor, paymentDate, paypalAccessPeriods, type PayPalGrant } from "@/lib/paypal-payments";
import { PayPalError, paypalConfig, paypalSandboxAllowed } from "./paypalService";

export type PurchaseStatus = "CREATING" | "CREATED" | "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED";

export function money(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function dateValue(value: unknown) {
  if (value instanceof Timestamp) return value.toDate();
  if (value && typeof value === "object" && "toDate" in value) return (value as { toDate(): Date }).toDate();
  const parsed = value ? new Date(String(value)) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed : null;
}

export async function resolvePurchasePricing(input: { planId: string; versionId: string; courseId: string; couponCode?: string }) {
  const db = getAdminDb();
  const [planDoc, courseDoc] = await Promise.all([
    db.collection("pricingPlans").doc(input.planId).get(),
    db.collection("courses").doc(input.courseId).get(),
  ]);
  if (!planDoc.exists || planDoc.data()?.isActive === false) throw new Error("Plan is unavailable");
  if (!courseDoc.exists) throw new Error("Course is unavailable");
  const plan = planDoc.data() || {};
  const courseIds = Array.isArray(plan.accessScopes?.courseIds) ? plan.accessScopes.courseIds.map(String) : [];
  if (!courseIds.includes(input.courseId)) throw new Error("Plan does not belong to this course");
  const versions = Array.isArray(plan.versions) ? plan.versions : [];
  const legacy = { id: "legacy-default", months: plan.expiryMonths, price: plan.price, durationLabel: plan.durationLabel };
  const version = (input.versionId
    ? versions.find((item: Record<string, unknown>) => String(item.id) === input.versionId)
    : versions[0]) || (input.versionId === "legacy-default" || (!input.versionId && versions.length === 0) ? legacy : null);
  if (!version) throw new Error("Plan version is unavailable");
  const originalAmount = money(Number(version.price ?? version.originalPrice ?? 0));
  if (!Number.isInteger(Number(version.months || plan.expiryMonths)) || Number(version.months || plan.expiryMonths) < 1 || Number(version.months || plan.expiryMonths) > 120) throw new PayPalError("INVALID_ACCESS_DURATION", 400);
  if (!Number.isFinite(originalAmount) || originalAmount <= 0) throw new Error("Plan price is invalid");

  let discountAmount = 0;
  let couponCode: string | null = null;
  if (input.couponCode?.trim()) {
    const code = input.couponCode.trim().toUpperCase();
    const snap = await db.collection("pricingCoupons").where("code", "==", code).limit(1).get();
    if (snap.empty) throw new Error("Coupon is invalid");
    const couponDoc = snap.docs[0];
    const coupon = couponDoc.data();
    const now = Date.now();
    const starts = dateValue(coupon.startsAt)?.getTime();
    const ends = dateValue(coupon.endsAt)?.getTime();
    const legacyCouponIds = Array.isArray(plan.versions)
      ? plan.versions.map((item: Record<string, unknown>) => String(item?.couponId || ""))
      : [];
    const eligibleCouponIds = new Set([
      ...(Array.isArray(plan.eligibleCouponIds) ? plan.eligibleCouponIds.map(String) : []),
      ...legacyCouponIds,
      String(plan.couponId || ""),
    ]);
    const allowedPlanIds = Array.isArray(coupon.allowedPlanIds)
      ? coupon.allowedPlanIds.map(String)
      : [];
    const isEligible = eligibleCouponIds.has(couponDoc.id) || allowedPlanIds.includes(planDoc.id);
    if (coupon.isActive === false || (starts && starts > now) || (ends && ends < now) || !isEligible) {
      throw new Error("Coupon is not valid for this plan");
    }
    const value = Number(coupon.discountValue || 0);
    discountAmount = money(coupon.discountType === "amount" ? value : originalAmount * value / 100);
    discountAmount = Math.min(originalAmount, Math.max(0, discountAmount));
    couponCode = code;
  }
  const subtotal = money(originalAmount - discountAmount);
  const configuredTax = Number(process.env.TAX ?? 0);
  const taxPercent = Number.isFinite(configuredTax) && configuredTax >= 0 ? configuredTax : 0;
  const taxAmount = money(subtotal * taxPercent / 100);
  const paidAmount = money(subtotal + taxAmount);
  return {
    planId: planDoc.id,
    versionId: String(version.id),
    courseId: courseDoc.id,
    courseName: String(courseDoc.data()?.title || plan.name || "Course"),
    planName: String(plan.name || "Plan"),
    durationMonths: Number(version.months || plan.expiryMonths || 0),
    originalAmount, discountAmount, taxAmount, paidAmount,
    currency: "GBP", couponCode, payLaterEnabled: version.payLaterEnabled !== false,
  };
}

export function serializePurchase(id: string, data: Record<string, unknown>) {
  const iso = (value: unknown) => dateValue(value)?.toISOString() || null;
  return { id, provider: data.provider || "paypal", status: data.status, planId: data.planId, courseId: data.courseId,
    planNameSnapshot: data.planNameSnapshot, courseNameSnapshot: data.courseNameSnapshot,
    durationMonths: data.durationMonths, currency: data.currency, originalAmount: data.originalAmount,
    discountAmount: data.discountAmount, taxAmount: data.taxAmount, paidAmount: data.paidAmount,
    amountMinor: data.amountMinor, refundedMinor: data.refundedMinor || 0,
    paypalOrderId: data.paypalOrderId || null, paypalCaptureId: data.paypalCaptureId || null,
    environment: data.environment || null, checkoutIntent: data.checkoutIntent || "paypal", financingStatus: "not_available",
    purchasedAt: iso(data.purchasedAt), accessStartsAt: iso(data.accessStartsAt), accessEndsAt: iso(data.accessEndsAt),
    verifiedAt: iso(data.verifiedAt), createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt) };
}

export function serializeAdminPurchase(id: string, data: Record<string, unknown>) {
  return { ...serializePurchase(id, data), userId: data.userId, reviewRequired: data.reviewRequired === true,
    refundReviewRequired: data.refundReviewRequired === true, disputeReviewRequired: data.disputeReviewRequired === true,
    disputeId: data.disputeId || null, disputeStatus: data.disputeStatus || null, needsReconciliation: data.needsReconciliation === true,
    nextReconcileAt: paymentDate(data.nextReconcileAt)?.toISOString() || null };
}

export async function listCustomerPurchases(uid: string) {
  const snap = await getAdminDb().collection("purchases").where("userId", "==", uid).limit(1001).get();
  if (snap.size > 1000) throw new PayPalError("ACCOUNT_RECONCILIATION_REQUIRED", 409);
  const periods = paypalAccessPeriods(snap.docs.map(d => ({ ...d.data(), id: d.id }) as PayPalGrant), uid, paypalSandboxAllowed());
  return snap.docs.map(doc => {
    const data = doc.data(), period = periods.find(p => p.id === doc.id);
    const dates = data.verificationVersion === 3 && data.provider === "paypal"
      ? { accessStartsAt: period?.accessStartsAt || null, accessEndsAt: period?.accessEndsAt || null } : {};
    return serializePurchase(doc.id, { ...data, ...dates });
  }).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
}

/** Only call after authenticating the order and capture with PayPal on the server. */
export async function completePurchase(input: { purchaseId: string; paypalOrderId: string; paypalCaptureId: string;
  amount: number; currency: string; environment: string; merchantId: string; providerPaidAt: string }) {
  const config = paypalConfig();
  if (input.environment !== config.environment || !input.merchantId) throw new PayPalError("PAYMENT_ACCOUNT_MISMATCH", 409);
  const providerDate = paymentDate(input.providerPaidAt);
  if (!providerDate || providerDate.getTime() > Date.now() + 300000) throw new PayPalError("INVALID_PAYMENT_TIMESTAMP", 409);
  const db = getAdminDb(), ref = db.collection("purchases").doc(input.purchaseId);
  const captureRef = db.collection("paypalCaptures").doc(input.paypalCaptureId);
  return db.runTransaction(async tx => {
    const [snap, captureSnap] = await Promise.all([tx.get(ref), tx.get(captureRef)]);
    if (!snap.exists) throw new PayPalError("PURCHASE_NOT_FOUND", 404);
    const purchase = snap.data()!;
    if (purchase.paypalOrderId !== input.paypalOrderId || purchase.environment !== input.environment
      || purchase.merchantId !== input.merchantId || (purchase.paypalAccountKey && purchase.paypalAccountKey !== config.accountKey)) throw new PayPalError("PAYMENT_ORDER_MISMATCH", 409);
    if (purchase.amountMinor !== amountToMinor(input.amount) || purchase.currency !== input.currency) throw new PayPalError("PAYMENT_AMOUNT_MISMATCH", 409);
    if (captureSnap.exists && (captureSnap.data()?.purchaseId !== input.purchaseId || captureSnap.data()?.environment !== input.environment)) throw new PayPalError("CAPTURE_ALREADY_USED", 409);
    if (purchase.status === "COMPLETED") return { alreadyCompleted: true, purchaseId: ref.id };
    if (!["CREATED", "PENDING"].includes(purchase.status)) throw new PayPalError("PURCHASE_STATE_CONFLICT", 409);
    const [records, user] = await Promise.all([
      tx.get(db.collection("purchases").where("userId", "==", purchase.userId).limit(1001)),
      tx.get(db.collection("users").doc(purchase.userId)),
    ]);
    if (records.size > 1000) throw new PayPalError("ACCOUNT_RECONCILIATION_REQUIRED", 409);
    // Raw profile contains manual/legacy grants; new PayPal grants never overwrite it.
    const base = user.data();
    const accessBaseEndsAt = base?.activePlanId === purchase.planId && base?.activePlanStatus === "active"
      ? dateValue(base.planExpiresAt) : null;
    const grant = { ...purchase, id: ref.id, status: "COMPLETED", verificationVersion: 3, purchasedAt: providerDate, accessBaseEndsAt } as PayPalGrant;
    const periods = paypalAccessPeriods([...records.docs.filter(d => d.id !== ref.id).map(d => ({ ...d.data(), id: d.id }) as PayPalGrant), grant], purchase.userId, input.environment === "sandbox");
    const period = periods.find(p => p.id === ref.id);
    if (!period) throw new PayPalError("INVALID_ACCESS_DURATION", 409);
    const now = new Date();
    tx.set(ref, { status: "COMPLETED", verificationVersion: 3, paypalCaptureId: input.paypalCaptureId,
      purchasedAt: providerDate, verifiedAt: now, accessBaseEndsAt, accessStartsAt: new Date(period.accessStartsAt),
      accessEndsAt: new Date(period.accessEndsAt), updatedAt: now, needsReconciliation: true, nextReconcileAt: new Date(Date.now() + 3600000) }, { merge: true });
    tx.set(captureRef, { purchaseId: ref.id, paypalOrderId: input.paypalOrderId, environment: input.environment,
      amountMinor: purchase.amountMinor, currency: purchase.currency, merchantId: input.merchantId, providerPaidAt: providerDate, verifiedAt: now });
    tx.set(db.collection("paypalMailOutbox").doc(ref.id), { purchaseId: ref.id, status: "PENDING", nextAttemptAt: now, createdAt: now });
    return { alreadyCompleted: false, purchaseId: ref.id };
  });
}
