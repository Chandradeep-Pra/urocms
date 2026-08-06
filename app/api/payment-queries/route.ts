import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const query = String(body?.query || "").trim();
    const planId = String(body?.planId || "").trim();
    const couponCode = String(body?.couponCode || "").trim().toUpperCase();
    const platform = body?.platform === "web" ? "web" : "mobile";

    if (!email || !query) {
      return NextResponse.json({ error: "Email and payment query are required" }, { status: 400 });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (query.length > 2000) {
      return NextResponse.json({ error: "Payment query must not exceed 2000 characters" }, { status: 400 });
    }

    const ref = await getAdminDb().collection("paymentQueries").add({
      email,
      query,
      planId: planId || null,
      couponCode: couponCode || null,
      platform,
      status: "open",
      createdAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json(
      { success: true, message: "Payment query raised", queryId: ref.id },
      { status: 201 },
    );
  } catch (error) {
    console.error("Payment query submission error:", error);
    return NextResponse.json({ error: "Failed to raise payment query" }, { status: 500 });
  }
}
