import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";

type AppTier = "guest" | "free" | "paid";

function normalizeTier(value: unknown): AppTier {
  return value === "paid" || value === "free" || value === "guest" ? value : "guest";
}

function pickHighestTier(values: unknown[]): AppTier {
  if (values.some((value) => value === "paid")) return "paid";
  if (values.some((value) => value === "free")) return "free";
  return "guest";
}

function firstNonEmptyString(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return null;
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const normalizedEmail = String(decoded.email || "").trim().toLowerCase();

    if (!normalizedEmail) {
      return NextResponse.json(
        { error: "Google account email is required" },
        { status: 400 }
      );
    }

    const usersRef = adminDb.collection("users");
    const currentRef = usersRef.doc(decoded.uid);
    const [currentSnap, sameEmailSnap] = await Promise.all([
      currentRef.get(),
      usersRef.where("email", "==", normalizedEmail).get(),
    ]);

    const currentData = currentSnap.data() ?? {};
    const duplicateDocs = sameEmailSnap.docs.filter((doc) => doc.id !== decoded.uid);
    const duplicateUsers = duplicateDocs.map((doc) => ({
      id: doc.id,
      data: doc.data() ?? {},
    }));

    const mergedTier = pickHighestTier([
      currentData.tier,
      ...duplicateUsers.map((user) => user.data.tier),
      decoded.firebase?.sign_in_provider === "anonymous" ? "guest" : "free",
    ]);

    const payload = {
      email: normalizedEmail,
      googleAccessEmail: normalizedEmail,
      source: "google.com",
      tier: mergedTier,
      name: firstNonEmptyString(currentData.name, decoded.name, ...duplicateUsers.map((user) => user.data.name)),
      phone: firstNonEmptyString(currentData.phone, ...duplicateUsers.map((user) => user.data.phone)),
      country: firstNonEmptyString(currentData.country, ...duplicateUsers.map((user) => user.data.country)),
      createdAt:
        currentData.createdAt ||
        duplicateUsers.find((user) => user.data.createdAt)?.data.createdAt ||
        new Date().toISOString(),
      upgradedAt:
        currentData.upgradedAt ||
        duplicateUsers.find((user) => user.data.upgradedAt)?.data.upgradedAt ||
        null,
      googleLinkedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const batch = adminDb.batch();
    batch.set(currentRef, payload, { merge: true });

    for (const duplicate of duplicateUsers) {
      batch.set(
        adminDb.collection("userMergeAudit").doc(),
        {
          mergedAt: new Date().toISOString(),
          email: normalizedEmail,
          fromUid: duplicate.id,
          toUid: decoded.uid,
          snapshot: duplicate.data,
        },
        { merge: false }
      );
      batch.delete(usersRef.doc(duplicate.id));
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      uid: decoded.uid,
      email: normalizedEmail,
      googleAccessEmail: normalizedEmail,
      tier: normalizeTier(payload.tier),
      linkedExistingUser: duplicateUsers.length > 0,
      mergedUserCount: duplicateUsers.length,
    });
  } catch (error) {
    console.error("Google auth finalize error:", error);
    return NextResponse.json(
      { error: "Failed to finalize Google sign-in" },
      { status: 500 }
    );
  }
}
