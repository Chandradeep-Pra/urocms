import { NextRequest, NextResponse } from "next/server";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { requireAdminSession } from "@/lib/server/adminAccess";
import { serializePurchase } from "@/lib/server/purchaseService";
export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req); if (response) return response;
  const snap = await getAdminDb().collection("purchases").orderBy("createdAt", "desc").limit(200).get();
  return NextResponse.json({ purchases: snap.docs.map((doc) => serializePurchase(doc.id, doc.data())) });
}
