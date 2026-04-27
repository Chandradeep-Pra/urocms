import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import {
  getConfiguredDriveResourceIds,
  grantDriveAccessToEmail,
} from "@/lib/server/googleDrive";

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

    const { name, phone, googleAccessEmail } = await req.json();
    const normalizedAccessEmail =
      (googleAccessEmail || decoded.email || "").trim().toLowerCase();

    await adminDb.collection("users").doc(decoded.uid).set({
      name,
      phone,
      tier: "paid",
      googleAccessEmail: normalizedAccessEmail || null,
      upgradedAt: new Date(),
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
