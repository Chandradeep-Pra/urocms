import { FieldValue, Timestamp } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendPurchaseConfirmationEmail } from "@/lib/server/emailService";

export type PurchaseStatus = "CREATED" | "PENDING" | "COMPLETED" | "FAILED" | "CANCELLED" | "REFUNDED";

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
  const version = versions.find((item: Record<string, unknown>) => String(item.id) === input.versionId)
    || (input.versionId === "legacy-default" ? legacy : null);
  if (!version) throw new Error("Plan version is unavailable");
  const originalAmount = money(Number(version.price ?? version.originalPrice ?? 0));
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
    const eligible = new Set([
      ...(Array.isArray(plan.eligibleCouponIds) ? plan.eligibleCouponIds.map(String) : []),
      ...(Array.isArray(coupon.allowedPlanIds) ? coupon.allowedPlanIds.map(String) : []),
      String(plan.couponId || ""),
    ]);
    if (coupon.isActive === false || (starts && starts > now) || (ends && ends < now) || !eligible.has(couponDoc.id)) {
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
    currency: String(plan.currency || "GBP").toUpperCase(), couponCode,
  };
}

export function serializePurchase(id: string, data: Record<string, unknown>) {
  const iso = (value: unknown) => dateValue(value)?.toISOString() || null;
  return { id, ...data, purchasedAt: iso(data.purchasedAt), accessStartsAt: iso(data.accessStartsAt), accessEndsAt: iso(data.accessEndsAt), createdAt: iso(data.createdAt), updatedAt: iso(data.updatedAt) };
}

export async function completePurchase(input: { purchaseId: string; paypalOrderId: string; paypalCaptureId: string; amount: number; currency: string }) {
  const db = getAdminDb();
  const purchaseRef = db.collection("purchases").doc(input.purchaseId);
  const captureRef = db.collection("paypalCaptures").doc(input.paypalCaptureId);
  const result = await db.runTransaction(async (tx) => {
    const [purchaseSnap, captureSnap] = await Promise.all([tx.get(purchaseRef), tx.get(captureRef)]);
    if (!purchaseSnap.exists) throw new Error("Purchase not found");
    const purchase = purchaseSnap.data() || {};
    if (purchase.paypalOrderId !== input.paypalOrderId) throw new Error("PayPal order mismatch");
    if (money(Number(purchase.paidAmount)) !== money(input.amount)) throw new Error("Paid amount mismatch");
    if (String(purchase.currency).toUpperCase() !== input.currency.toUpperCase()) throw new Error("Paid currency mismatch");
    if (purchase.status === "COMPLETED") return { alreadyCompleted: true, data: purchase, email: null };
    if (captureSnap.exists && captureSnap.data()?.purchaseId !== input.purchaseId) throw new Error("Capture already belongs to another purchase");

    const now = new Date();
    const entitlementRef = db.collection("courseEntitlements").doc(`${purchase.userId}_${purchase.courseId}`);
    const entitlementSnap = await tx.get(entitlementRef);
    const currentEnd = dateValue(entitlementSnap.data()?.accessEndsAt);
    const accessStartsAt = now;
    const extensionBase = currentEnd && currentEnd > now ? currentEnd : now;
    const accessEndsAt = new Date(extensionBase);
    accessEndsAt.setUTCMonth(accessEndsAt.getUTCMonth() + Number(purchase.durationMonths || 0));
    if (!(accessEndsAt > accessStartsAt)) throw new Error("Purchase duration is invalid");
    const completed = { status: "COMPLETED", paypalCaptureId: input.paypalCaptureId, purchasedAt: now, accessStartsAt, accessEndsAt, emailSentAt: null, updatedAt: now };
    tx.set(purchaseRef, completed, { merge: true });
    tx.set(captureRef, { purchaseId: input.purchaseId, paypalOrderId: input.paypalOrderId, createdAt: now });
    tx.set(entitlementRef, { userId: purchase.userId, courseId: purchase.courseId, planId: purchase.planId, purchaseId: input.purchaseId, status: "ACTIVE", accessStartsAt, accessEndsAt, updatedAt: now, createdAt: entitlementSnap.exists ? entitlementSnap.data()?.createdAt : now }, { merge: true });
    tx.set(db.collection("users").doc(String(purchase.userId)), {
      tier: "paid", activePlanId: purchase.planId, activePlanStatus: "active", planActivatedAt: accessStartsAt.toISOString(), planExpiresAt: accessEndsAt.toISOString(),
      activeCourseIds: FieldValue.arrayUnion(purchase.courseId), updatedAt: now.toISOString(), upgradedAt: now.toISOString(),
    }, { merge: true });
    const email: Parameters<typeof sendPurchaseConfirmationEmail>[0] = { to: String(purchase.userEmail || ""), name: String(purchase.userName || ""), courseName: String(purchase.courseNameSnapshot), planName: String(purchase.planNameSnapshot), amount: Number(purchase.paidAmount), currency: String(purchase.currency), orderReference: input.paypalOrderId, purchaseDate: now, accessEndsAt };
    return { alreadyCompleted: false, data: { ...purchase, ...completed }, email };
  });

  if (result.email && !result.alreadyCompleted && result.email.to) {
    try {
      await sendPurchaseConfirmationEmail(result.email);
      await purchaseRef.set({ emailSentAt: new Date(), updatedAt: new Date() }, { merge: true });
    } catch (error) {
      console.error("Purchase confirmation email failed", { purchaseId: input.purchaseId, error: error instanceof Error ? error.message : "unknown" });
    }
  }
  return result;
}
