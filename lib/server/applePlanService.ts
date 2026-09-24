import "server-only";
import { FieldValue } from "firebase-admin/firestore";
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
        return {
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
  return null;
}

export type ApplePurchaseFulfillmentInput = {
  userId: string;
  userEmail?: string | null;
  userName?: string | null;
  productId: string;
  transactionId: string;
  transactionDate?: string | number | null;
  purchaseToken?: string | null;
};

export async function verifyAndFulfillApplePurchase(input: ApplePurchaseFulfillmentInput) {
  const productId = String(input.productId || "").trim();
  const transactionId = String(input.transactionId || "").trim();
  if (!productId) throw new Error("Apple product ID is required");
  if (!transactionId) throw new Error("Apple transaction ID is required");

  const resolved = await findPlanByAppleProductId(productId);
  if (!resolved) {
    throw new Error(`No active Apple plan found matching product ID '${productId}'`);
  }

  const db = getAdminDb();
  const txRef = db.collection("appleTransactions").doc(transactionId);
  const userRef = db.collection("users").doc(input.userId);

  return db.runTransaction(async (tx) => {
    const [txSnap, userSnap] = await Promise.all([
      tx.get(txRef),
      tx.get(userRef),
    ]);

    if (txSnap.exists) {
      const existing = txSnap.data() || {};
      if (existing.userId !== input.userId) {
        throw new Error("This Apple transaction is already linked to another account");
      }
      return {
        alreadyCompleted: true,
        planId: resolved.planId,
        accessEndsAt: existing.accessEndsAt ? String(existing.accessEndsAt) : null,
      };
    }

    const now = new Date();
    const userData = userSnap.data() || {};
    const existingExpiryRaw = userData.planExpiresAt;
    const existingExpiry = existingExpiryRaw ? new Date(String(existingExpiryRaw)) : null;
    const baseDate = existingExpiry && !Number.isNaN(existingExpiry.getTime()) && existingExpiry > now
      ? existingExpiry
      : now;

    const accessStartsAt = now;
    const accessEndsAt = new Date(baseDate);
    accessEndsAt.setUTCMonth(accessEndsAt.getUTCMonth() + resolved.months);

    const purchaseRef = db.collection("purchases").doc();

    tx.set(txRef, {
      transactionId,
      productId,
      planId: resolved.planId,
      versionId: resolved.versionId,
      userId: input.userId,
      purchaseToken: input.purchaseToken || null,
      accessStartsAt: accessStartsAt.toISOString(),
      accessEndsAt: accessEndsAt.toISOString(),
      createdAt: now.toISOString(),
    });

    tx.set(purchaseRef, {
      userId: input.userId,
      userEmail: input.userEmail || null,
      userName: input.userName || null,
      planId: resolved.planId,
      versionId: resolved.versionId,
      planNameSnapshot: resolved.planName,
      durationMonths: resolved.months,
      paidAmount: resolved.price,
      currency: resolved.currency,
      provider: "app-store",
      appleProductId: productId,
      appleTransactionId: transactionId,
      status: "COMPLETED",
      accessStartsAt,
      accessEndsAt,
      purchasedAt: now,
      createdAt: now,
      updatedAt: now,
    });

    for (const courseId of resolved.courseIds) {
      const entitlementRef = db.collection("courseEntitlements").doc(`${input.userId}_${courseId}`);
      tx.set(entitlementRef, {
        userId: input.userId,
        courseId,
        planId: resolved.planId,
        purchaseId: purchaseRef.id,
        status: "ACTIVE",
        accessStartsAt,
        accessEndsAt,
        updatedAt: now,
        createdAt: now,
      }, { merge: true });
    }

    const userUpdate: Record<string, unknown> = {
      tier: "paid",
      activePlanId: resolved.planId,
      activePlanStatus: "active",
      planActivatedAt: accessStartsAt.toISOString(),
      planExpiresAt: accessEndsAt.toISOString(),
      updatedAt: now.toISOString(),
      upgradedAt: now.toISOString(),
    };

    if (resolved.courseIds.length > 0) {
      userUpdate.activeCourseIds = FieldValue.arrayUnion(...resolved.courseIds);
    }

    tx.set(userRef, userUpdate, { merge: true });

    return {
      alreadyCompleted: false,
      planId: resolved.planId,
      accessEndsAt: accessEndsAt.toISOString(),
      purchaseId: purchaseRef.id,
    };
  });
}
