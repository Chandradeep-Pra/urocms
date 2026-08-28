import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";
import { serializePurchase } from "@/lib/server/purchaseService";
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  const { id } = await context.params; const doc = await getAdminDb().collection("purchases").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  if (doc.data()?.userId !== auth.user.uid) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  return NextResponse.json({ purchase: serializePurchase(doc.id, doc.data() || {}) });
}
