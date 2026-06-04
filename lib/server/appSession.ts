import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { type AppTier } from "@/lib/appAccess";
import { type AppPlanStatus } from "@/lib/server/appPlanAccess";
import { normalizeEmail, resolveCanonicalUserRecord } from "@/lib/server/userIdentity";

export interface AppUserSession {
  authUid: string;
  uid: string;
  email: string | null;
  name: string | null;
  profileImageUrl: string | null;
  tier: AppTier;
  googleAccessEmail: string | null;
  source: string | null;
  activeCourseIds: string[];
  activePlanId: string | null;
  activePlanStatus: AppPlanStatus;
  planActivatedAt: unknown;
  planExpiresAt: unknown;
  vivaMinutesUsed: number;
}

function getDefaultTier(_signInProvider?: string): AppTier {
  return "guest";
}

function normalizeTier(value: unknown): AppTier {
  return value === "paid" || value === "free" || value === "guest" ? value : "guest";
}

function normalizePlanStatus(value: unknown): AppPlanStatus {
  return value === "active" || value === "expired" || value === "none" ? value : "none";
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
        name: decoded.name ?? null,
        tier: defaultTier,
        googleAccessEmail: decoded.email ?? null,
        source: decoded.firebase.sign_in_provider ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await userRef.set(nextUser, { merge: true });
    }

    const resolved = await resolveCanonicalUserRecord({
      authUid: decoded.uid,
      email: normalizeEmail(decoded.email),
      signInProvider: decoded.firebase.sign_in_provider ?? null,
      firebaseName: decoded.name ?? null,
      source: decoded.firebase.sign_in_provider ?? null,
    });
    const user = resolved.userData ?? {};

    return {
      user: {
        authUid: decoded.uid,
        uid: resolved.uid,
        email: user.email ?? decoded.email ?? null,
        name: user.name ?? decoded.name ?? null,
        profileImageUrl:
          typeof user.profileImageUrl === "string" && user.profileImageUrl.trim()
            ? user.profileImageUrl.trim()
            : null,
        tier: normalizeTier(user.tier),
        googleAccessEmail: user.googleAccessEmail ?? user.email ?? decoded.email ?? null,
        source: user.source ?? decoded.firebase.sign_in_provider ?? null,
        activeCourseIds: Array.isArray(user.activeCourseIds) ? user.activeCourseIds : [],
        activePlanId: user.activePlanId ? String(user.activePlanId) : null,
        activePlanStatus: normalizePlanStatus(user.activePlanStatus),
        planActivatedAt: user.planActivatedAt ?? null,
        planExpiresAt: user.planExpiresAt ?? null,
        vivaMinutesUsed: Number.isFinite(Number(user.vivaMinutesUsed))
          ? Math.max(0, Number(user.vivaMinutesUsed))
          : 0,
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
