import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { ensureGuestAppUser } from "@/lib/server/appOnboardingService";
import { normalizeEmail } from "@/lib/server/userIdentity";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);

    const uid = decoded.uid;
    const { email } = await req.json();
    const requestedEmail = normalizeEmail(typeof email === "string" ? email : null);

    if (!requestedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const user = await ensureGuestAppUser({
      uid,
      authEmail: decoded.email ?? null,
      requestedEmail,
      source: decoded.firebase.sign_in_provider ?? "mobile-app",
      firebaseName: decoded.name ?? null,
    });

    return NextResponse.json({
      success: true,
      existing: user.existing,
      reusedExistingGuest: user.reusedExistingGuest ?? false,
      canonicalUserId: user.canonicalUserId ?? user.id,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        tier: user.tier,
        source: user.source,
      },
    });
  } catch (err) {
    console.error("Guest API error:", err);
    return NextResponse.json({ error: "Failed" }, { status: 500 });
  }
}
