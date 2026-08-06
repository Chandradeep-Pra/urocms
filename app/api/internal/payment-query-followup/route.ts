import { NextRequest, NextResponse } from "next/server";
import { sendPaymentQueryFollowUp } from "@/lib/server/paymentQueryFollowUp";

export async function POST(req: NextRequest) {
  const expectedSecret = process.env.PAYMENT_QUERY_TASK_SECRET?.trim();
  const suppliedSecret = req.headers.get("x-payment-query-task-secret")?.trim();
  if (!expectedSecret || suppliedSecret !== expectedSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const queryId = String((await req.json())?.queryId || "").trim();
    if (!queryId) {
      return NextResponse.json({ error: "queryId is required" }, { status: 400 });
    }
    return NextResponse.json({ success: true, ...(await sendPaymentQueryFollowUp(queryId)) });
  } catch (error) {
    console.error("Payment query follow-up error:", error);
    return NextResponse.json({ error: "Failed to send follow-up email" }, { status: 500 });
  }
}
