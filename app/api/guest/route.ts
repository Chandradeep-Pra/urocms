import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import { normalizeEmail } from "@/lib/server/userIdentity";

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
    const normalizedEmail = normalizeEmail(email);

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
      const resolvedTier = existingUser.tier === "paid" ? "paid" : "free";

      if (resolvedTier !== existingUser.tier) {
        await existingUserDoc.ref.set(
          {
            tier: resolvedTier,
            updatedAt: new Date().toISOString(),
          },
          { merge: true }
        );
      }

      await adminDb.collection("users").doc(uid).set(
        {
          name: existingUser.name ?? "Guest User",
          email: normalizedEmail,
          tier: resolvedTier,
          googleAccessEmail: existingUser.googleAccessEmail ?? normalizedEmail,
          source: "mobile-app",
          linkedExistingUserId: existingUserDoc.id,
          canonicalUserId: existingUserDoc.id,
          isShadowDuplicate: true,
          updatedAt: new Date().toISOString(),
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
          tier: resolvedTier,
          source: existingUser.source ?? "mobile-app",
          linkedExistingUserId: existingUserDoc.id,
        },
      });
    }

    await adminDb.collection("users").doc(uid).set({
      name: "Guest User",
      email: normalizedEmail,
      tier: "free",
      googleAccessEmail: normalizedEmail,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      source: "mobile-app",
      canonicalUserId: uid,
      isShadowDuplicate: false,
    }, { merge: true });

    return NextResponse.json({
      success: true,
      existing: false,
      user: {
        id: uid,
        name: "Guest User",
        email: normalizedEmail,
        tier: "free",
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
