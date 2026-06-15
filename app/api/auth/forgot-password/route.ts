import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { sendBrandedPasswordResetEmail } from "@/lib/server/emailService";

function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : "";
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body.email);

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const resetLink = await adminAuth.generatePasswordResetLink(email, {
      url: `${process.env.NEXT_PUBLIC_SITE_URL?.trim() || "https://urologics.co.uk"}/login`,
      handleCodeInApp: false,
    });

    await sendBrandedPasswordResetEmail({
      to: email,
      resetLink,
    });

    return NextResponse.json({
      success: true,
      message: "If an account exists, a password reset email has been sent.",
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return NextResponse.json({
      success: true,
      message: "If an account exists, a password reset email has been sent.",
    });
  }
}
