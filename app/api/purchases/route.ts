import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";
import { serializePurchase } from "@/lib/server/purchaseService";
export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req); if ("response" in auth) return auth.response;
  const snap = await getAdminDb().collection("purchases").where("userId", "==", auth.user.uid).get();
  const purchases = snap.docs.map((doc) => serializePurchase(doc.id, doc.data())).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
  return NextResponse.json({ purchases });
}
