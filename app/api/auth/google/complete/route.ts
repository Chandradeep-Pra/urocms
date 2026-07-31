import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { normalizeEmail, resolveCanonicalUserRecord } from "@/lib/server/userIdentity";

type AppTier = "guest" | "free" | "paid";

function normalizeTier(value: unknown): AppTier {
  return value === "paid" || value === "free" || value === "guest" ? value : "guest";
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await getAdminAuth().verifyIdToken(token);
    const normalizedEmail = normalizeEmail(decoded.email);

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Google account email is required" },
        { status: 400 }
      );
    }

    const resolved = await resolveCanonicalUserRecord({
      authUid: decoded.uid,
      email: normalizedEmail,
      signInProvider: "google.com",
      firebaseName: decoded.name ?? null,
      source: "google.com",
    });

    return NextResponse.json({
      success: true,
      uid: resolved.uid,
      email: normalizedEmail,
      googleAccessEmail: normalizedEmail,
      tier: normalizeTier(resolved.userData.tier),
      linkedExistingUser: resolved.mergedUserCount > 0,
      mergedUserCount: resolved.mergedUserCount,
    });
  } catch (error) {
    console.error("Google auth finalize error:", error);
    return NextResponse.json(
      { error: "Failed to finalize Google sign-in" },
      { status: 500 }
    );
  }
}
