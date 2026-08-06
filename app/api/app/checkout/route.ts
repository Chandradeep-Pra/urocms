import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";

function isSafeCheckoutUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

function isCouponCurrentlyActive(data: Record<string, unknown>) {
  if (data.isActive === false) return false;
  const now = Date.now();
  const parseDate = (value: unknown) => {
    if (!value) return null;
    if (
      typeof value === "object" &&
      value !== null &&
      "toDate" in value &&
      typeof (value as { toDate?: () => Date }).toDate === "function"
    ) {
      return (value as { toDate: () => Date }).toDate().getTime();
    }
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : null;
  };
  const startsAt = parseDate(data.startsAt);
  const endsAt = parseDate(data.endsAt);
  return (!startsAt || startsAt <= now) && (!endsAt || endsAt >= now);
}

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  const planId = String(req.nextUrl.searchParams.get("planId") || "").trim();
  const versionId = String(req.nextUrl.searchParams.get("versionId") || "").trim();
  if (!planId || !versionId) {
    return NextResponse.json({ error: "Plan and version are required" }, { status: 400 });
  }

  const db = getAdminDb();
  const planDoc = await db.collection("pricingPlans").doc(planId).get();
  if (!planDoc.exists || planDoc.data()?.isActive === false) {
    return NextResponse.json({ error: "Plan is unavailable" }, { status: 404 });
  }

  const plan = planDoc.data() ?? {};
  const versions = Array.isArray(plan.versions) ? plan.versions : [];
  const version = versions.find(
    (item: Record<string, unknown>) => String(item?.id || "") === versionId,
  );
  if (!version) {
    return NextResponse.json({ error: "Plan version is unavailable" }, { status: 404 });
  }

  const checkoutUrl = String(version.embeddedLink || plan.embeddedLink || "").trim();
  if (!checkoutUrl || !isSafeCheckoutUrl(checkoutUrl)) {
    return NextResponse.json({ error: "Checkout is not configured for this plan" }, { status: 409 });
  }

  const legacyCouponIds = versions
    .map((item: Record<string, unknown>) => String(item?.couponId || ""))
    .filter(Boolean);
  const eligibleCouponIds = Array.from(
    new Set([
      ...(Array.isArray(plan.eligibleCouponIds)
        ? plan.eligibleCouponIds.map((id: unknown) => String(id || ""))
        : []),
      ...legacyCouponIds,
      String(plan.couponId || ""),
    ].filter(Boolean)),
  );
  const couponDocs = eligibleCouponIds.length
    ? await db.getAll(...eligibleCouponIds.map((id) => db.collection("pricingCoupons").doc(id)))
    : [];
  const coupons = couponDocs
    .filter((doc) => doc.exists && isCouponCurrentlyActive(doc.data() ?? {}))
    .map((doc) => {
      const data = doc.data() ?? {};
      return {
        id: doc.id,
        code: String(data.code || ""),
        description: String(data.description || ""),
        discountType: data.discountType === "amount" ? "amount" : "percent",
        discountValue: Number(data.discountValue || 0),
        isMarketing: doc.id === String(plan.marketingCouponId || plan.couponId || ""),
      };
    });

  return NextResponse.json({
    plan: {
      id: planDoc.id,
      name: String(plan.name || "Selected course"),
      description: String(plan.description || ""),
    },
    version: {
      id: String(version.id || ""),
      months: Number(version.months || 0),
      durationLabel: String(version.durationLabel || ""),
      currency: String(plan.currency || "GBP"),
      originalPrice: Number(version.price ?? version.originalPrice ?? 0),
    },
    coupons,
    checkoutUrl,
    user: {
      uid: auth.user.uid,
      email: auth.user.email,
      name: auth.user.name,
    },
  });
}
