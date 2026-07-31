import { NextRequest, NextResponse } from "next/server";
import { getAdminAuth } from "@/lib/firebaseAdmin";
import { isAllowedAdminEmail } from "@/lib/server/adminAccess";

function getBearerToken(req: NextRequest) {
  const authHeader = req.headers.get("authorization");

  if (!authHeader?.startsWith("Bearer ")) {
    return null;
  }

  return authHeader.slice("Bearer ".length).trim();
}

export async function GET(req: NextRequest) {
  try {
    const token = getBearerToken(req);

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const decodedToken = await getAdminAuth().verifyIdToken(token);
    const email =
      typeof decodedToken.email === "string" ? decodedToken.email.trim().toLowerCase() : "";
    const isAdmin = isAllowedAdminEmail(email);

    return NextResponse.json({
      success: true,
      isAdmin,
      role: isAdmin ? "admin" : "user",
      email,
      uid: decodedToken.uid,
    });
  } catch (error) {
    console.error("Auth role check error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
