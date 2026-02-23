import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);

    const { name, phone } = await req.json();

    await adminDb.collection("users").doc(decoded.uid).update({
      name,
      phone,
      tier: "free",
      upgradedAt: new Date(),
    });

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Upgrade error:", err);
    return NextResponse.json(
      { error: "Failed to upgrade" },
      { status: 500 }
    );
  }
}