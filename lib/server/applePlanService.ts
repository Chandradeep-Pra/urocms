import "server-only";
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
