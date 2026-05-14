import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";

export async function GET(req: NextRequest) {
  const { session, response } = await requireAdminSession(req);

  if (response || !session) {
    return response || NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    return NextResponse.json({
      success: true,
      email: session.email,
      uid: session.uid,
    });
  } catch (error) {
    console.error("Admin session check error:", error);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
