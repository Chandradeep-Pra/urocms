import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { type AppTier } from "@/lib/appAccess";

export interface AppUserSession {
  uid: string;
  email: string | null;
  name: string | null;
  tier: AppTier;
  googleAccessEmail: string | null;
  source: string | null;
}

function getDefaultTier(signInProvider?: string): AppTier {
  return signInProvider === "anonymous" ? "guest" : "free";
}

function normalizeTier(value: unknown): AppTier {
  return value === "paid" || value === "free" || value === "guest" ? value : "guest";
}

export async function requireAppUser(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  try {
    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const userRef = adminDb.collection("users").doc(decoded.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      const defaultTier = getDefaultTier(decoded.firebase.sign_in_provider);
      const nextUser = {
        email: decoded.email ?? null,
        tier: defaultTier,
        googleAccessEmail: decoded.email ?? null,
        source: decoded.firebase.sign_in_provider ?? null,
        createdAt: new Date().toISOString(),
      };

      await userRef.set(nextUser, { merge: true });

      return {
        user: {
          uid: decoded.uid,
          email: decoded.email ?? null,
          name: null,
          tier: defaultTier,
          googleAccessEmail: decoded.email ?? null,
          source: decoded.firebase.sign_in_provider ?? null,
        } satisfies AppUserSession,
      };
    }

    const user = userDoc.data() ?? {};

    return {
      user: {
        uid: decoded.uid,
        email: user.email ?? decoded.email ?? null,
        name: user.name ?? decoded.name ?? null,
        tier: normalizeTier(user.tier),
        googleAccessEmail: user.googleAccessEmail ?? user.email ?? decoded.email ?? null,
        source: user.source ?? decoded.firebase.sign_in_provider ?? null,
      } satisfies AppUserSession,
    };
  } catch (error) {
    console.error("App auth error:", error);
    return {
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}

export function tierLockedResponse(params: {
  feature: string;
  tier: AppTier;
  requiredTier: AppTier;
  reason: string;
}) {
  return NextResponse.json(
    {
      error: params.reason,
      access: {
        feature: params.feature,
        tier: params.tier,
        allowed: false,
        requiredTier: params.requiredTier,
      },
    },
    { status: 403 }
  );
}
