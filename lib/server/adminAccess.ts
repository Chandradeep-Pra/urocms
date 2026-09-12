import "server-only";
import type { DecodedIdToken } from "firebase-admin/auth";
import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";

export type AdminSession = {
  uid: string;
  email: string;
  decodedToken: DecodedIdToken;
};

export function parseAdminAllowlist(raw?: string): string[] {
  if (!raw?.trim()) return [];
  try {
    const value = raw.trim();
    const entries: unknown = value.startsWith("[") ? JSON.parse(value) : value.split(",");
    if (!Array.isArray(entries) || entries.some((entry) => typeof entry !== "string")) return [];
    const emails = entries.map((entry: string) => entry.trim().toLowerCase());
    if (emails.some((email) => !/^[^\s@<>\[\]{}"\\,]+@[^\s@<>\[\]{}"\\,]+\.[^\s@<>\[\]{}"\\,]+$/.test(email))) return [];
    return [...new Set(emails)];
  } catch {
    return [];
  }
}

export function getAllowedAdminEmails() {
  return parseAdminAllowlist(process.env.ADMIN_ALLOWED_EMAILS);
}

export function isAllowedAdminEmail(email?: string | null) {
  if (!email) return false;
  const normalizedEmail = email.trim().toLowerCase();
  const allowedEmails = getAllowedAdminEmails();

  return allowedEmails.includes(normalizedEmail);
}

export function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

export const AUTH_COOKIE = "__session";

export function isSameOriginRequest(req: NextRequest) {
  try {
    const expected = process.env.NEXT_PUBLIC_SITE_URL ||
      (process.env.NODE_ENV === "production" ? "https://urologics.co.uk" : req.url);
    return req.headers.get("origin") === new URL(expected).origin;
  } catch {
    return false;
  }
}

export async function verifyAdminToken(token: string): Promise<AdminSession | null> {
  const decodedToken = await getAdminAuth().verifyIdToken(token, true);
  const email = typeof decodedToken.email === "string" ? decodedToken.email.trim().toLowerCase() : "";
  return isAllowedAdminEmail(email) ? { uid: decodedToken.uid, email, decodedToken } : null;
}

export async function requireAdminSession(
  req: NextRequest
): Promise<{ session: AdminSession | null; response: NextResponse | null }> {
  try {
    const bearer = getBearerToken(req);
    // Cookie-authenticated mutations require a trusted Origin to prevent CSRF.
    const cookieAllowed = ["GET", "HEAD"].includes(req.method) || isSameOriginRequest(req);
    const token = bearer || (cookieAllowed ? req.cookies.get(AUTH_COOKIE)?.value : null);

    if (!token) {
      return {
        session: null,
        response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      };
    }

    const session = await verifyAdminToken(token);
    if (!session) {
      return {
        session: null,
        response: NextResponse.json({ error: "Admin access denied" }, { status: 403 }),
      };
    }

    return {
      session,
      response: null,
    };
  } catch {
    return {
      session: null,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
}
