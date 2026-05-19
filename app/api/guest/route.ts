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
    const normalizedEmail = String(email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const existingUserSnapshot = await adminDb
      .collection("users")
      .where("email", "==", normalizedEmail)
      .limit(1)
      .get();

    if (!existingUserSnapshot.empty) {
      const existingUserDoc = existingUserSnapshot.docs[0];
      const existingUser = existingUserDoc.data();

      await adminDb.collection("users").doc(uid).set(
        {
          name: existingUser.name ?? "Guest User",
          email: normalizedEmail,
          tier: existingUser.tier ?? "guest",
          googleAccessEmail: existingUser.googleAccessEmail ?? normalizedEmail,
          source: "mobile-app",
          linkedExistingUserId: existingUserDoc.id,
          updatedAt: new Date(),
        },
        { merge: true }
      );

      return NextResponse.json({
        success: true,
        existing: true,
        user: {
          id: uid,
          name: existingUser.name ?? "Guest User",
          email: existingUser.email ?? normalizedEmail,
          tier: existingUser.tier ?? "guest",
          source: existingUser.source ?? "mobile-app",
          linkedExistingUserId: existingUserDoc.id,
        },
      });
    }

    await adminDb.collection("users").doc(uid).set({
      name: "Guest User",
      email: normalizedEmail,
      tier: "guest",
      googleAccessEmail: normalizedEmail,
      createdAt: new Date(),
      updatedAt: new Date(),
      source: "mobile-app",
    }, { merge: true });

    return NextResponse.json({
      success: true,
      existing: false,
      user: {
        id: uid,
        name: "Guest User",
        email: normalizedEmail,
        tier: "guest",
        source: "mobile-app",
      },
    });
  } catch (err) {
  console.error("Guest API error:", err);
  return NextResponse.json(
    { error: "Failed" },
    { status: 500 }
  );
}
}
