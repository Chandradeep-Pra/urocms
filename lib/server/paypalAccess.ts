import "server-only";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { paymentDate, paypalAccessPeriods, type PayPalGrant } from "@/lib/paypal-payments";
import { PayPalError, paypalSandboxAllowed } from "./paypalService";
import type { AppUserSession } from "./appSession";

/** Server-owned ledger overlays manual/Apple access; refunds never rewrite other grants. */
export async function applyPayPalAccess(uid: string, original: Partial<AppUserSession> & Record<string, unknown>) {
  const user = { ...original, paypalPlanIds: [] as string[] };
  const snap = await getAdminDb().collection("purchases").where("userId", "==", uid).limit(1001).get();
  if (snap.size > 1000) throw new PayPalError("ACCOUNT_RECONCILIATION_REQUIRED", 503);
  const periods = paypalAccessPeriods(snap.docs.map(d => ({ ...d.data(), id: d.id }) as PayPalGrant), uid, paypalSandboxAllowed())
    .filter(p => Date.parse(p.accessStartsAt) <= Date.now() && Date.parse(p.accessEndsAt) > Date.now());
  user.paypalPlanIds = [...new Set(periods.map(p => p.planId))];
  if (periods.length) {
    user.activeCourseIds = [...new Set([...(Array.isArray(original.activeCourseIds) ? original.activeCourseIds : []), ...periods.map(p => p.courseId)])];
    user.tier = "paid";
    const primary = periods.sort((a, b) => b.accessEndsAt.localeCompare(a.accessEndsAt))[0];
    const currentEnd = paymentDate(original.planExpiresAt)?.getTime() || 0;
    if (!original.activePlanId || original.activePlanStatus !== "active" || currentEnd <= Date.now()) {
      user.activePlanId = primary.planId; user.activePlanStatus = "active";
      user.planActivatedAt = primary.accessStartsAt; user.planExpiresAt = primary.accessEndsAt;
    } else if (original.activePlanId === primary.planId && currentEnd < Date.parse(primary.accessEndsAt)) user.planExpiresAt = primary.accessEndsAt;
  }
  return user;
}
