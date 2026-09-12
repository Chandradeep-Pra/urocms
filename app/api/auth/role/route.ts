import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { AUTH_COOKIE, getBearerToken, isAllowedAdminEmail, isSameOriginRequest } from "@/lib/server/adminAccess";
import { getPostLoginDestination } from "@/lib/user-app";

const cookieOptions = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export async function GET(req: NextRequest) {
  try {
    const token = getBearerToken(req);
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const decodedToken = await getAdminAuth().verifyIdToken(token, true);
    const isAdmin = isAllowedAdminEmail(decodedToken.email);
    const next = req.nextUrl.searchParams.get("next");
    const response = NextResponse.json({
      success: true, isAdmin, role: isAdmin ? "admin" : "user",
      uid: decodedToken.uid,
      email: typeof decodedToken.email === "string" ? decodedToken.email.trim().toLowerCase() : "",
      destination: getPostLoginDestination(next, isAdmin),
      studentDestination: getPostLoginDestination(next, false),
    }, { headers: { "Cache-Control": "private, no-store" } });
    // Reuse the student's existing Firebase ID-token cookie, not a second session.
    response.cookies.set(AUTH_COOKIE, token, {
      ...cookieOptions, maxAge: Math.max(0, decodedToken.exp - Math.floor(Date.now() / 1000)),
    });
    return response;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSameOriginRequest(req)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const response = NextResponse.json({ success: true }, { headers: { "Cache-Control": "no-store" } });
  response.cookies.set(AUTH_COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return response;
}
