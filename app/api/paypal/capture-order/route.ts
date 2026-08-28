import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";
import { capturePayPalOrder, getPayPalOrder } from "@/lib/server/paypalService";
import { completePurchase } from "@/lib/server/purchaseService";

function captureFrom(order: unknown) {
  const typed = order as { purchase_units?: Array<{ payments?: { captures?: Array<{ id?: unknown; status?: unknown; amount?: { value?: unknown; currency_code?: unknown } }> } }> };
  return typed.purchase_units?.[0]?.payments?.captures?.[0];
}
export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  try {
    const body = await req.json(); const orderId = String(body.orderId || "").trim();
    if (!orderId) return NextResponse.json({ error: "PayPal order ID is required" }, { status: 400 });
    const snap = await getAdminDb().collection("purchases").where("paypalOrderId", "==", orderId).limit(1).get();
    if (snap.empty) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
    const purchaseDoc = snap.docs[0]; const purchase = purchaseDoc.data();
    if (purchase.userId !== auth.user.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    if (purchase.status === "COMPLETED") return NextResponse.json({ success: true, alreadyCompleted: true, purchaseId: purchaseDoc.id });
    let order = await getPayPalOrder(orderId);
    if (order.status !== "COMPLETED") order = await capturePayPalOrder(orderId, `capture-${purchaseDoc.id}`);
    const capture = captureFrom(order);
    if (order.status !== "COMPLETED" || capture?.status !== "COMPLETED") return NextResponse.json({ error: "Payment verification pending", pending: true }, { status: 409 });
    const result = await completePurchase({ purchaseId: purchaseDoc.id, paypalOrderId: orderId, paypalCaptureId: String(capture.id), amount: Number(capture.amount?.value), currency: String(capture.amount?.currency_code) });
    return NextResponse.json({ success: true, alreadyCompleted: result.alreadyCompleted, purchaseId: purchaseDoc.id });
  } catch (error) {
    console.error("PayPal capture failed", { error: error instanceof Error ? error.message : "unknown" });
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to verify payment", pending: true }, { status: 409 });
  }
}
