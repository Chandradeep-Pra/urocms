import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import {
  getConfiguredDriveResourceIds,
  grantDriveAccessToEmail,
} from "@/lib/server/googleDrive";
import { requireAppUser } from "@/lib/server/appSession";
import { normalizeEmail } from "@/lib/server/userIdentity";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAppUser(req);
    if ("response" in auth) return auth.response;

    const { name, phone, country, googleAccessEmail } = await req.json();
    const normalizedAccessEmail = normalizeEmail(
      googleAccessEmail || auth.user.googleAccessEmail || auth.user.email || ""
    );

    await adminDb.collection("users").doc(auth.user.uid).set({
      name,
      phone,
      country,
      tier: "free",
      googleAccessEmail: normalizedAccessEmail || null,
      canonicalUserId: auth.user.uid,
      isShadowDuplicate: false,
      upgradedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }, { merge: true });

    const configuredResourceIds = getConfiguredDriveResourceIds();

    if (normalizedAccessEmail && configuredResourceIds.length > 0) {
      await grantDriveAccessToEmail(normalizedAccessEmail, configuredResourceIds);
    }

    return NextResponse.json({
      success: true,
      tier: "free",
      googleAccessEmail: normalizedAccessEmail || null,
      driveAccessGranted:
        normalizedAccessEmail.length > 0 && configuredResourceIds.length > 0,
    });

  } catch (err) {
    console.error("Upgrade error:", err);
    return NextResponse.json(
      { error: "Failed to upgrade" },
      { status: 500 }
    );
  }
}
