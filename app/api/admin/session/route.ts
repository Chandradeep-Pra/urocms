import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebaseAdmin";
import { isAllowedAdminEmail } from "@/lib/server/adminAccess";

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const email = typeof decoded.email === "string" ? decoded.email : null;

    if (!isAllowedAdminEmail(email)) {
      return NextResponse.json({ error: "Admin access denied" }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      email,
      uid: decoded.uid,
    });
  } catch (error) {
    console.error("Admin session check error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
