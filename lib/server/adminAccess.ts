import type { DecodedIdToken } from "firebase-admin/auth";
import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";

export type AdminSession = {
  uid: string;
  email: string;
  decodedToken: DecodedIdToken;
};

export function getAllowedAdminEmails() {
  return (process.env.ADMIN_ALLOWED_EMAILS || process.env.NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS || "")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedAdminEmail(email?: string | null) {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const allowedEmails = getAllowedAdminEmails();

  return allowedEmails.includes(normalizedEmail);
}

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

export async function requireAdminSession(
  req: NextRequest
): Promise<{ session: AdminSession | null; response: NextResponse | null }> {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return {
        session: null,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const email = typeof decodedToken.email === "string" ? decodedToken.email.trim().toLowerCase() : "";

    if (!isAllowedAdminEmail(email)) {
      return {
        session: null,
        response: NextResponse.json({ error: "Admin access denied" }, { status: 403 }),
      };
    }

    return {
      session: {
        uid: decodedToken.uid,
        email,
        decodedToken,
      },
      response: null,
    };
  } catch (error) {
    console.error("Admin session validation error:", error);
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}
