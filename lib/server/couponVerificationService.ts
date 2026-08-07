import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";

export type CouponPlatform = "mobile" | "web";

type CouponVerificationInput = {
  planId?: unknown;
  versionId?: unknown;
  couponCode?: unknown;
};

function asIdList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(new Set(value.map((item) => String(item || "").trim()).filter(Boolean)));
}

function asDate(value: unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (
    typeof value === "object" &&
    value !== null &&
    "toDate" in value &&
    typeof (value as { toDate?: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function roundMoney(value: number) {
  return Math.round(value * 100) / 100;
}

export class CouponVerificationError extends Error {
  constructor(
    message: string,
    public readonly reason: string,
    public readonly status = 400,
  ) {
    super(message);
  }
}

export async function verifyPlanCoupon(
  input: CouponVerificationInput,
  platform: CouponPlatform,
) {
  const planId = String(input.planId || "").trim();
  const versionId = String(input.versionId || "").trim();
  const couponCode = String(input.couponCode || "").trim().toUpperCase();

  if (!planId || !couponCode) {
    throw new CouponVerificationError(
      "Plan and coupon code are required",
      "missing_fields",
    );
  }

  const db = getAdminDb();
  const [planDoc, couponSnap] = await Promise.all([
    db.collection("pricingPlans").doc(planId).get(),
    db.collection("pricingCoupons").where("code", "==", couponCode).limit(1).get(),
  ]);

  if (!planDoc.exists || planDoc.data()?.isActive === false) {
    throw new CouponVerificationError("Plan is unavailable", "plan_unavailable", 404);
  }
  if (couponSnap.empty) {
    throw new CouponVerificationError("Coupon code is invalid", "invalid_coupon");
  }

  const plan = planDoc.data() ?? {};
  const couponDoc = couponSnap.docs[0];
  const coupon = couponDoc.data() ?? {};
  const legacyCouponIds = Array.isArray(plan.versions)
    ? plan.versions.map((version: Record<string, unknown>) => String(version?.couponId || ""))
    : [];
  const eligibleCouponIds = asIdList([
    ...asIdList(plan.eligibleCouponIds),
    ...legacyCouponIds,
    plan.couponId,
  ]);

  if (!eligibleCouponIds.includes(couponDoc.id)) {
    throw new CouponVerificationError(
      "Coupon is not eligible for this plan",
      "coupon_not_eligible",
    );
  }
  if (coupon.isActive === false) {
    throw new CouponVerificationError("Coupon is inactive", "coupon_inactive");
  }

  const now = new Date();
  const startsAt = asDate(coupon.startsAt);
  const endsAt = asDate(coupon.endsAt);
  if (startsAt && startsAt > now) {
    throw new CouponVerificationError("Coupon is not active yet", "coupon_not_started");
  }
  if (endsAt && endsAt < now) {
    throw new CouponVerificationError("Coupon has expired", "coupon_expired");
  }

  const versions = Array.isArray(plan.versions) ? plan.versions : [];
  const legacyVersion = {
    id: "legacy-default",
    months: Number(plan.expiryMonths || 1),
    price: Number(plan.price || 0),
    originalPrice: Number(plan.originalPrice ?? plan.price ?? 0),
  };
  const version = versionId
    ? versions.find((item: Record<string, unknown>) => String(item?.id || "") === versionId) ||
      (versionId === "legacy-default" ? legacyVersion : null)
    : versions[0] || legacyVersion;
  if (!version) {
    throw new CouponVerificationError("Plan version is unavailable", "version_unavailable", 404);
  }

  const originalPrice = Number(version.price ?? version.originalPrice ?? plan.price ?? 0);
  const discountType = coupon.discountType === "amount" ? "amount" : "percent";
  const discountValue = Number(coupon.discountValue ?? 0);
  if (!Number.isFinite(originalPrice) || !Number.isFinite(discountValue) || discountValue <= 0) {
    throw new CouponVerificationError("Coupon configuration is invalid", "invalid_configuration");
  }

  const discountedPrice = roundMoney(
    discountType === "percent"
      ? Math.max(0, originalPrice - (originalPrice * discountValue) / 100)
      : Math.max(0, originalPrice - discountValue),
  );

  await db.collection("couponVerifications").add({
    planId,
    versionId: String(version.id || ""),
    couponId: couponDoc.id,
    couponCode,
    platform,
    applied: true,
    createdAt: FieldValue.serverTimestamp(),
  });

  return {
    applied: true,
    message: "Coupon Applied",
    platform,
    plan: {
      id: planDoc.id,
      name: String(plan.name || ""),
    },
    version: {
      id: String(version.id || ""),
      months: Number(version.months || 0),
    },
    coupon: {
      id: couponDoc.id,
      code: String(coupon.code || ""),
      description: String(coupon.description || ""),
      discountType,
      discountValue,
    },
    pricing: {
      currency: String(plan.currency || "GBP"),
      originalPrice,
      discountAmount: roundMoney(originalPrice - discountedPrice),
      discountedPrice,
    },
  };
}

export function couponFailureResponse(error: unknown, paymentQueryEndpoint: string) {
  const known = error instanceof CouponVerificationError ? error : null;
  return {
    body: {
      applied: false,
      message: "Coupon Applied Failed",
      reason: known?.reason || "verification_failed",
      error: known?.message || "Unable to verify coupon",
      canRaiseQuery: true,
      paymentQueryEndpoint,
    },
    status: known?.status || 500,
  };
}
