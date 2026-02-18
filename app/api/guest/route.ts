import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);

    const uid = decoded.uid;
    const { email } = await req.json();

    await adminDb.collection("users").doc(uid).set({
      email,
      tier: "guest",
      createdAt: new Date(),
      source: "mobile-app",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
  console.error("Guest API error:", err);
  return NextResponse.json(
    { error: "Failed" },
    { status: 500 }
  );
}
}
