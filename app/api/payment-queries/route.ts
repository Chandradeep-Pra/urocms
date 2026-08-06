import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";
import { sendPaymentQueryConfirmationEmail } from "@/lib/server/emailService";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = String(body?.email || "").trim().toLowerCase();
    const name = String(body?.name || "").trim();
    const query = String(body?.query || "").trim();
    const planId = String(body?.planId || "").trim();
    const couponCode = String(body?.couponCode || "").trim().toUpperCase();
    const platform = body?.platform === "web" ? "web" : "mobile";

    if (!name || !email || !query || !planId) {
      return NextResponse.json(
        { error: "Name, email, plan and payment query are required" },
        { status: 400 },
      );
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 });
    }
    if (query.length > 2000) {
      return NextResponse.json({ error: "Payment query must not exceed 2000 characters" }, { status: 400 });
    }

    const db = getAdminDb();
    const [planDoc, couponSnap] = await Promise.all([
      db.collection("pricingPlans").doc(planId).get(),
      couponCode
        ? db.collection("pricingCoupons").where("code", "==", couponCode).limit(1).get()
        : Promise.resolve(null),
    ]);

    if (!planDoc.exists) {
      return NextResponse.json({ error: "Selected plan was not found" }, { status: 404 });
    }

    const planName = String(planDoc.data()?.name || "Untitled plan");
    const couponDoc = couponSnap && !couponSnap.empty ? couponSnap.docs[0] : null;
    const couponName = couponDoc
      ? String(couponDoc.data().code || couponCode)
      : couponCode || "Not provided";

    const ref = await db.collection("paymentQueries").add({
      name,
      email,
      query,
      planId,
      planName,
      couponId: couponDoc?.id || null,
      couponName,
      couponCode: couponCode || null,
      platform,
      status: "open",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    let emailSent = false;
    try {
      await sendPaymentQueryConfirmationEmail({
        to: email,
        name,
        queryId: ref.id,
        query,
        planName,
        couponName,
      });
      emailSent = true;
      await ref.set(
        { confirmationEmail: { sent: true, sentAt: FieldValue.serverTimestamp() } },
        { merge: true },
      );
    } catch (emailError) {
      console.error("Payment query confirmation email error:", emailError);
      await ref.set(
        {
          confirmationEmail: {
            sent: false,
            error: emailError instanceof Error ? emailError.message : "Email delivery failed",
            attemptedAt: FieldValue.serverTimestamp(),
          },
        },
        { merge: true },
      );
    }

    return NextResponse.json(
      {
        success: true,
        message: "Payment query raised",
        queryId: ref.id,
        planName,
        couponName,
        emailSent,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Payment query submission error:", error);
    return NextResponse.json({ error: "Failed to raise payment query" }, { status: 500 });
  }
}
