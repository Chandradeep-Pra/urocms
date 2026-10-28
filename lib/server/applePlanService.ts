import "server-only";
import { fulfillVerifiedApplePurchase } from "./applePurchaseLedger";
import { ApplePaymentError } from "./appleStoreServer";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { parseApplePlanPricing, validateApplePlanPricing } from "@/lib/apple-plans";

const strings = (value: unknown) => Array.isArray(value)
  ? value.filter((item): item is string => typeof item === "string" && !!item.trim())
  : [];
const number = (value: unknown) => Number.isFinite(Number(value)) ? Number(value) : 0;

/** Public Apple catalog allowlist: never inherit web coupons or checkout URLs. */
export function toApplePlan(id: string, data: Record<string, any>) {
  if (data.isActive === false) return null;
  const versions = (Array.isArray(data.versions) ? data.versions : []).flatMap((version: Record<string, unknown>) => {
    if (!version || typeof version !== "object") return [];
    const apple = parseApplePlanPricing(version.apple);
    if (!apple.enabled || validateApplePlanPricing(apple) || !version.id || number(version.months) <= 0) return [];
    return [{
      id: String(version.id),
      months: number(version.months),
      durationLabel: String(version.durationLabel || `${version.months} months`),
      productId: apple.productId,
      ...(apple.offerId ? { offerId: apple.offerId } : {}),
      price: apple.price!,
      currency: apple.currency,
      priceSource: "cms-reference" as const,
      purchaseProvider: "app-store" as const,
    }];
  });
  if (!versions.length) return null;
  return {
    id,
    name: String(data.name || "Untitled plan"),
    description: String(data.description || ""),
    category: String(data.category || "Programs"),
    categorySortOrder: number(data.categorySortOrder),
    sortOrder: number(data.sortOrder),
    tag: String(data.tag || ""),
    featureBullets: strings(data.featureBullets),
    vivaMinutes: Math.max(0, number(data.vivaMinutes)),
    versions,
  };
}

export async function listApplePlans() {
  const snapshot = await getAdminDb().collection("pricingPlans").get();
  return snapshot.docs.map(doc => toApplePlan(doc.id, doc.data()))
    .filter((plan): plan is NonNullable<typeof plan> => plan !== null)
    .sort((a, b) => a.categorySortOrder - b.categorySortOrder || a.category.localeCompare(b.category)
      || a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
}

export async function getApplePlan(id: string) {
  const doc = await getAdminDb().collection("pricingPlans").doc(id).get();
  return doc.exists ? toApplePlan(doc.id, doc.data() ?? {}) : null;
}

export type ResolvedApplePlanVersion = {
  planId: string;
  planName: string;
  versionId: string;
  months: number;
  price: number;
  currency: "GBP";
  productId: string;
  courseIds: string[];
  vivaMinutes: number;
};

export async function findPlanByAppleProductId(productId: string): Promise<ResolvedApplePlanVersion | null> {
  const cleanId = String(productId || "").trim();
  if (!cleanId) return null;
  const snapshot = await getAdminDb().collection("pricingPlans").get();
  let match: ResolvedApplePlanVersion | null = null;
  for (const doc of snapshot.docs) {
    const data = doc.data() || {};
    if (data.isActive === false) continue;
    const versions = Array.isArray(data.versions) ? data.versions : [];
    for (const v of versions) {
      if (!v || typeof v !== "object") continue;
      const apple = parseApplePlanPricing(v.apple);
      if (apple.enabled && apple.productId === cleanId && !validateApplePlanPricing(apple)) {
        const courseIds = Array.isArray(data.accessScopes?.courseIds)
          ? data.accessScopes.courseIds.map(String).filter(Boolean)
          : [];
        if (match) throw new ApplePaymentError("AMBIGUOUS_APPLE_PRODUCT", 409);
        match = {
          planId: doc.id,
          planName: String(data.name || "Untitled plan"),
          versionId: String(v.id || ""),
          months: number(v.months),
          price: apple.price ?? 0,
          currency: apple.currency,
          productId: cleanId,
          courseIds,
          vivaMinutes: Math.max(0, number(data.vivaMinutes)),
        };
      }
    }
  }
  return match;
}

export type ApplePurchaseFulfillmentInput = {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  productId: string;
  transactionId: string;
  offerId?: string | null;
  transactionDate?: string | number | null;
  purchaseToken?: string | null;
};

export async function verifyAndFulfillApplePurchase(input: ApplePurchaseFulfillmentInput) {
  const resolved = await findPlanByAppleProductId(input.productId);
  if (!resolved) throw new ApplePaymentError("APPLE_PRODUCT_UNAVAILABLE", 404);
  return fulfillVerifiedApplePurchase(input, resolved);
}
