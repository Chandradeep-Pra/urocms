import { NextRequest, NextResponse } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { verifyAndFulfillApplePurchase } from "@/lib/server/applePlanService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const productId = String(body.productId || "").trim();
    const transactionId = String(body.transactionId || "").trim();
    const transactionDate = body.transactionDate ?? null;
    const purchaseToken = typeof body.purchaseToken === "string" ? body.purchaseToken.trim() : null;

    if (!productId) {
      return NextResponse.json({ error: "Product ID is required" }, { status: 400 });
    }
    if (!transactionId) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const result = await verifyAndFulfillApplePurchase({
      userId: auth.user.uid,
      userEmail: auth.user.email,
      userName: auth.user.name,
      productId,
      transactionId,
      transactionDate,
      purchaseToken,
    });

    return NextResponse.json({
      success: true,
      alreadyCompleted: result.alreadyCompleted,
      planId: result.planId,
      accessEndsAt: result.accessEndsAt,
    });
  } catch (error) {
    console.error("Apple purchase verification failed", {
      error: error instanceof Error ? error.message : "unknown",
    });
    const message = (error instanceof Error || (error && typeof error === "object" && "message" in error))
      ? String((error as { message: unknown }).message)
      : "Failed to verify Apple purchase";
    const lower = message.toLowerCase();
    const status = (lower.includes("not found") || lower.includes("no active apple plan") || lower.includes("found matching")) ? 404
      : lower.includes("already linked") ? 409
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
