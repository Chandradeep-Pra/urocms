import "server-only";
import { randomUUID } from "node:crypto";
import { Environment, DeliveryStatus, type JWSTransactionDecodedPayload } from "@apple/app-store-server-library";
import { getAdminDb } from "@/lib/firebaseAdmin";
import type { ApplePurchaseFulfillmentInput, ResolvedApplePlanVersion } from "./applePlanService";
import type { AppUserSession } from "./appSession";
import { ApplePaymentError, appleSecurityReady, fetchAppleTransaction, sandboxAllowed, transactionKey, verifyAppleNotification, sendAppleConsumption } from "./appleStoreServer";

export type AppleLedgerRecord = {
  verificationVersion?: number; fulfilled?: boolean; userId?: string | null;
  status?: string; environment?: string; signedDate?: number;
  transactionId?: string; originalTransactionId?: string; productId?: string;
  appAccountToken?: string; planId?: string; planName?: string; versionId?: string;
  months?: number; courseIds?: string[]; purchaseDate?: string;
  paidAmount?: number; currency?: string; refundedPercentage?: number;
  createdAt?: unknown; verifiedAt?: string;
  [key: string]: unknown;
};
type AppUserAccessData = Partial<Omit<AppUserSession, "uid" | "authUid" | "authTime">> & Record<string, unknown>;
const strings = (value: unknown): string[] => Array.isArray(value) ? value.filter((v): v is string => typeof v === "string") : [];
const millis = (value: unknown) => value instanceof Date ? value.getTime() : typeof value === "number" ? value : Date.parse(String(value || ""));
export function addAccessMonths(start: number, months: number) {
  if (!Number.isSafeInteger(start) || !Number.isInteger(months) || months < 1 || months > 120) throw new ApplePaymentError("INVALID_ACCESS_PERIOD", 400);
  const date = new Date(start), day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months);
  const endOfMonth = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, endOfMonth));
  return date.getTime();
}

/** Pure entitlement calculation: only authenticated, fulfilled ledger entries contribute access. */
export function appleAccessPeriods(records: AppleLedgerRecord[], uid: string): (AppleLedgerRecord & { accessStartsAt: string; accessEndsAt: string })[] {
  // Enable only after the server-owned Firestore collections and membership fields are protected.
  if (!appleSecurityReady()) return [];
  const ends = new Map<string, number>();
  return records.filter(r => r.verificationVersion === 2 && r.fulfilled === true && r.userId === uid
    && ["ACTIVE", "PARTIALLY_REFUNDED"].includes(r.status || "")
    && (r.environment === Environment.PRODUCTION || (r.environment === Environment.SANDBOX && sandboxAllowed(uid))))
    .sort((a,b) => millis(a.purchaseDate) - millis(b.purchaseDate) || String(a.transactionId).localeCompare(String(b.transactionId)))
    .map(record => {
      const planId = String(record.planId || "");
      if (!planId) throw new ApplePaymentError("INVALID_ACCESS_PERIOD", 400);
      const purchased = millis(record.purchaseDate);
      const start = Math.max(purchased, ends.get(planId) || 0);
      const fullEnd = addAccessMonths(start, Number(record.months));
      const refunded = Math.min(100000, Math.max(0, Number(record.refundedPercentage || 0)));
      const end = Math.floor(start + (fullEnd - start) * (1 - refunded / 100000));
      ends.set(planId, end);
      return { ...record, planId, accessStartsAt: new Date(start).toISOString(), accessEndsAt: new Date(end).toISOString() };
    });
}

export async function getAppleAccount(uid: string) {
  const db = getAdminDb(), ref = db.collection("appleAccounts").doc(uid);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (snap.exists && typeof snap.data()?.appAccountToken === "string") return snap.data()!;
    const appAccountToken = randomUUID();
    const account = { userId: uid, appAccountToken, consumptionConsent: false, consentVersion: 1, createdAt: new Date().toISOString() };
    tx.create(ref, account);
    tx.create(db.collection("appleAccountTokens").doc(appAccountToken), { userId: uid });
    return account;
  });
}
export async function setAppleConsumptionConsent(uid: string, consent: boolean) {
  await getAppleAccount(uid);
  await getAdminDb().collection("appleAccounts").doc(uid).update({ consumptionConsent: consent, consentVersion: 1, consentUpdatedAt: new Date().toISOString() });
}

function refundState(data: JWSTransactionDecodedPayload) {
  if (data.revocationDate == null) return { status: "ACTIVE", refundedPercentage: 0 };
  const percentage = data.revocationPercentage ?? 100000;
  if (!Number.isInteger(percentage) || percentage < 0 || percentage > 100000) throw new ApplePaymentError("INVALID_REFUND_STATE", 403);
  return { status: percentage < 100000 ? "PARTIALLY_REFUNDED" : "REFUNDED", refundedPercentage: percentage };
}

export async function fulfillVerifiedApplePurchase(input: ApplePurchaseFulfillmentInput, plan: ResolvedApplePlanVersion) {
  const data = await fetchAppleTransaction(input.transactionId, input.productId, input.userId);
  const db = getAdminDb(), key = transactionKey(data.environment!, input.transactionId);
  const ref = db.collection("appleTransactions").doc(key);
  const state = refundState(data);
  const result = await db.runTransaction(async tx => {
    const [accountSnap, currentSnap, recordsSnap] = await Promise.all([
      tx.get(db.collection("appleAccounts").doc(input.userId)), tx.get(ref),
      tx.get(db.collection("appleTransactions").where("userId", "==", input.userId).limit(1001)),
    ]);
    const account = accountSnap.data(), current = currentSnap.data();
    if (!account || String(account.appAccountToken).toLowerCase() !== data.appAccountToken!.toLowerCase()) throw new ApplePaymentError("PURCHASE_ACCOUNT_MISMATCH", 403);
    if (current?.userId && current.userId !== input.userId) throw new ApplePaymentError("PURCHASE_ACCOUNT_MISMATCH", 403);
    if (recordsSnap.size > 1000) throw new ApplePaymentError("ACCOUNT_RECONCILIATION_REQUIRED", 409);
    const stale = Number(current?.signedDate || 0) > data.signedDate!;
    const record: AppleLedgerRecord = {
      ...current, verificationVersion: 2, fulfilled: true, userId: input.userId,
      transactionId: data.transactionId, originalTransactionId: data.originalTransactionId,
      productId: data.productId, environment: data.environment, appAccountToken: data.appAccountToken!.toLowerCase(),
      planId: current?.planId || plan.planId, planName: current?.planName || plan.planName,
      versionId: current?.versionId || plan.versionId, months: current?.months || plan.months,
      courseIds: current?.courseIds || plan.courseIds,
      purchaseDate: new Date(data.purchaseDate!).toISOString(),
      createdAt: current?.createdAt || new Date(),
      paidAmount: data.price! / 1000, currency: data.currency,
      ...(!stale ? { ...state, signedDate: data.signedDate } : {}),
      verifiedAt: new Date().toISOString(),
    };
    const records = recordsSnap.docs.filter(doc => doc.id !== key).map(doc => doc.data());
    const period = appleAccessPeriods([...records, record], input.userId).find(r => r.transactionId === data.transactionId && r.environment === data.environment);
    const accessEndsAt = period?.accessEndsAt || new Date(data.purchaseDate!).toISOString();
    // No legacy aggregate user fields are written. Access is derived from the verified purchase ledger.
    tx.set(ref, record);
    tx.set(db.collection("purchases").doc(`apple_${key}`), {
      userId: input.userId, planId: record.planId, versionId: record.versionId,
      planNameSnapshot: record.planName, provider: "app-store", verificationVersion: 2,
      environment: data.environment, appleProductId: data.productId, appleTransactionId: data.transactionId,
      durationMonths: record.months, paidAmount: record.paidAmount, currency: record.currency,
      status: record.status === "REFUNDED" ? "REFUNDED" : "COMPLETED",
      purchasedAt: new Date(data.purchaseDate!), accessStartsAt: new Date(data.purchaseDate!), accessEndsAt: new Date(accessEndsAt),
      createdAt: current?.createdAt || new Date(), updatedAt: new Date(),
    }, { merge: true });
    return { alreadyCompleted: current?.fulfilled === true, planId: record.planId as string, accessEndsAt, refunded: record.status === "REFUNDED" || record.status === "REVOKED" };
  });
  if (result.refunded) throw new ApplePaymentError("PURCHASE_REFUNDED", 409);
  return result;
}

/** Apply the most recently signed state. Notification UUIDs make repeat delivery harmless. */
export async function processAppleNotification(signedPayload: string) {
  const { notification, transaction: data, environment } = await verifyAppleNotification(signedPayload);
  const db = getAdminDb(), eventRef = db.collection("appleNotifications").doc(notification.notificationUUID!);
  const event = { type: String(notification.notificationType), signedDate: notification.signedDate, environment };
  if (!data?.transactionId || !data.productId) {
    await eventRef.set({ ...event, processed: true, outcome: "no-transaction", receivedAt: new Date() });
    return;
  }
  const key = transactionKey(environment, data.transactionId), ref = db.collection("appleTransactions").doc(key);
  const owner = data.appAccountToken ? await db.collection("appleAccountTokens").doc(data.appAccountToken.toLowerCase()).get() : null;
  const uid = owner?.data()?.userId as string | undefined;
  if (environment === Environment.SANDBOX && (!uid || !sandboxAllowed(uid))) {
    await eventRef.set({ ...event, processed: true, outcome: "sandbox-not-allowed", receivedAt: new Date() }); return;
  }
  if (notification.notificationType === "CONSUMPTION_REQUEST") {
    const [previous, account, purchase] = await Promise.all([eventRef.get(), uid ? db.collection("appleAccounts").doc(uid).get() : null, ref.get()]);
    if (previous.data()?.processed) return;
    if (uid && account?.data()?.consumptionConsent === true && account.data()?.consentVersion === 1) {
      // Re-check consent immediately before sharing. Do not infer course usage from elapsed time.
      const latestConsent = await db.collection("appleAccounts").doc(uid).get();
      if (latestConsent.data()?.consumptionConsent === true) {
        await sendAppleConsumption(environment, data.transactionId, {
          customerConsented: true, deliveryStatus: purchase.data()?.fulfilled ? DeliveryStatus.DELIVERED : DeliveryStatus.UNDELIVERED_OTHER,
          sampleContentProvided: false,
        });
      }
    }
    await eventRef.set({ ...event, processed: true, outcome: "consumption-handled", receivedAt: new Date() }); return;
  }
  await db.runTransaction(async tx => {
    const [eventSnap, currentSnap] = await Promise.all([tx.get(eventRef), tx.get(ref)]);
    if (eventSnap.data()?.processed) return;
    const current = currentSnap.data();
    const stateChange = ["REFUND", "REVOKE", "REFUND_REVERSED"].includes(event.type);
    if (stateChange && Number(current?.signedDate || 0) <= Number(data.signedDate || notification.signedDate)) {
      if (current?.userId && uid && current.userId !== uid) throw new ApplePaymentError("PURCHASE_ACCOUNT_MISMATCH", 403);
      const state = event.type === "REVOKE" ? { status: "REVOKED", refundedPercentage: 100000 } : refundState(data);
      tx.set(ref, {
        ...current, ...state, userId: current?.userId || uid || null,
        transactionId: data.transactionId, productId: data.productId, environment,
        fulfilled: current?.fulfilled === true, signedDate: data.signedDate || notification.signedDate,
        lastNotification: event.type, updatedAt: new Date(),
      }, { merge: true });
      if (current?.fulfilled) tx.set(db.collection("purchases").doc(`apple_${key}`), {
        status: ["REFUNDED", "REVOKED"].includes(state.status) ? "REFUNDED" : "COMPLETED",
        refundedPercentage: state.refundedPercentage, updatedAt: new Date(),
      }, { merge: true });
    }
    tx.set(eventRef, { ...event, transactionId: data.transactionId, processed: true, receivedAt: new Date() });
  });
}

export async function listApplePurchases(uid: string) {
  const snapshot = await getAdminDb().collection("appleTransactions").where("userId", "==", uid).limit(1001).get();
  if (snapshot.size > 1000) throw new ApplePaymentError("ACCOUNT_RECONCILIATION_REQUIRED", 409);
  const records = snapshot.docs.map(doc => doc.data());
  const periods = appleAccessPeriods(records, uid);
  return records.filter(r => r.verificationVersion === 2 && r.fulfilled && (r.environment === Environment.PRODUCTION || sandboxAllowed(uid)))
    .map(r => ({ transactionId: r.transactionId, productId: r.productId, name: r.planName, months: r.months, status: r.status,
      purchasedAt: r.purchaseDate, accessEndsAt: periods.find(p => p.transactionId === r.transactionId && p.environment === r.environment)?.accessEndsAt || null }))
    .sort((a,b) => String(b.purchasedAt).localeCompare(String(a.purchasedAt)));
}

/** Overlay verified Apple grants without rewriting PayPal/manual membership state. */
export async function applyAppleAccess(uid: string, original: AppUserAccessData): Promise<AppUserAccessData> {
  const db = getAdminDb(), snapshot = await db.collection("appleTransactions").where("userId", "==", uid).limit(1001).get();
  if (snapshot.size > 1000) throw new ApplePaymentError("ACCOUNT_RECONCILIATION_REQUIRED", 409);
  if (snapshot.empty) return { ...original, applePlanIds: [] };
  const records = snapshot.docs.map(doc => doc.data()), legacy = records.filter(r => r.verificationVersion !== 2);
  const user = { ...original };
  if (legacy.length) {
    const planIds = [...new Set(legacy.map(r => String(r.planId || "")).filter(Boolean))];
    const plans = await Promise.all(planIds.map(id => db.collection("pricingPlans").doc(id).get()));
    const legacyCourses = new Set(plans.flatMap(p => strings(p.data()?.accessScopes?.courseIds)));
    const purchases = await db.collection("purchases").where("userId", "==", uid).get();
    const independent = purchases.docs.map(p => p.data()).filter(p => p.provider !== "app-store" && !p.appleTransactionId && p.status === "COMPLETED" && millis(p.accessEndsAt) > Date.now());
    const retained = new Set(independent.map(p => String(p.courseId || "")));
    user.activeCourseIds = strings(user.activeCourseIds).filter(id => !legacyCourses.has(id) || retained.has(id));
    if (planIds.includes(String(user.activePlanId)) && !independent.some(p => p.planId === user.activePlanId)) {
      user.activePlanId = null; user.activePlanStatus = "none"; user.planExpiresAt = null; user.planActivatedAt = null;
      if (!user.activeCourseIds.length) user.tier = "free";
    }
  }
  const periods = appleAccessPeriods(records, uid).filter(r => millis(r.accessStartsAt) <= Date.now() && millis(r.accessEndsAt) > Date.now());
  user.applePlanIds = [...new Set(periods.map(r => String(r.planId)))];
  user.activeCourseIds = [...new Set([...strings(user.activeCourseIds), ...periods.flatMap(r => strings(r.courseIds))])];
  if (periods.length) {
    user.tier = "paid";
    const primary = periods.sort((a,b) => millis(b.accessEndsAt) - millis(a.accessEndsAt))[0];
    if (!user.activePlanId || user.activePlanStatus === "expired" || millis(user.planExpiresAt) <= Date.now()) {
      user.activePlanId = primary.planId; user.activePlanStatus = "active";
      user.planActivatedAt = primary.accessStartsAt; user.planExpiresAt = primary.accessEndsAt;
    }
  }
  return user;
}
