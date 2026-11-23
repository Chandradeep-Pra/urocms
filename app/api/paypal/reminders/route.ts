import { NextRequest } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";
import { parsePayPalReminder, upcomingPayPalReminders } from "@/lib/paypal-payments";
import { paypalEnvironment, paypalSandboxAllowed, PayPalError } from "@/lib/server/paypalService";
import { limitPaymentRequests, paymentErrorResponse, paymentId, paymentJson, readPaymentJson } from "@/lib/server/paypalPaymentHttp";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  try {
    await limitPaymentRequests(auth.user.uid, "reminders-read", 60);
    const snap = await getAdminDb().collection("purchases").where("userId", "==", auth.user.uid).limit(1001).get();
    if (snap.size > 1000) throw new PayPalError("ACCOUNT_RECONCILIATION_REQUIRED", 409);
    const purchases = snap.docs.filter(d => d.data().provider === "paypal" && d.data().verificationVersion === 3 && d.data().status === "COMPLETED"
      && (d.data().environment === "live" || paypalSandboxAllowed())).sort((a, b) => a.id.localeCompare(b.id));
    const items = await Promise.all(purchases.map(async doc => {
      const saved = (await getAdminDb().collection("paypalReminders").doc(doc.id).get()).data();
      let reminder = null;
      if (saved?.userId === auth.user.uid) { try { reminder = parsePayPalReminder(saved); } catch { /* invalid data cannot create a reminder */ } }
      return { purchaseId: doc.id, planName: String(doc.data().planNameSnapshot || "Course"), reminder,
        upcoming: reminder ? upcomingPayPalReminders(reminder) : [] };
    }));
    return paymentJson({ items });
  } catch (error) { return paymentErrorResponse(error); }
}
export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  try {
    await limitPaymentRequests(auth.user.uid, "reminders-write", 20);
    const body = await readPaymentJson(req), id = paymentId(body.purchaseId, "PURCHASE");
    let reminder;
    try { reminder = parsePayPalReminder(body); } catch { throw new PayPalError("INVALID_REMINDER", 400); }
    const db = getAdminDb();
    await db.runTransaction(async tx => {
      const purchase = (await tx.get(db.collection("purchases").doc(id))).data();
      if (!purchase || purchase.userId !== auth.user.uid || purchase.provider !== "paypal" || purchase.verificationVersion !== 3) throw new PayPalError("PURCHASE_NOT_FOUND", 404);
      if (purchase.status !== "COMPLETED" || purchase.environment !== paypalEnvironment()
        || (purchase.environment === "sandbox" && !paypalSandboxAllowed())) throw new PayPalError("REMINDERS_UNAVAILABLE", 409);
      tx.set(db.collection("paypalReminders").doc(id), { ...reminder, userId: auth.user.uid, purchaseId: id, updatedAt: new Date() });
    });
    return paymentJson({ reminder, upcoming: upcomingPayPalReminders(reminder) });
  } catch (error) { return paymentErrorResponse(error); }
}
