import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { serializePurchase } from "@/lib/server/purchaseService";
export async function GET(req: NextRequest, context: { params: Promise<{ id: string }> }) {
  const { response } = await requireAdminSession(req); if (response) return response;
  const { id } = await context.params; const doc = await getAdminDb().collection("purchases").doc(id).get();
  if (!doc.exists) return NextResponse.json({ error: "Purchase not found" }, { status: 404 });
  return NextResponse.json({ purchase: serializePurchase(doc.id, doc.data() || {}) });
}
