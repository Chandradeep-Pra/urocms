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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decoded = await adminAuth.verifyIdToken(token);
    const userRef = adminDb.collection("users").doc(decoded.uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userDoc.data();

    if (user?.tier !== "paid") {
      return NextResponse.json({ error: "Paid access required" }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const googleAccessEmail = (body.googleAccessEmail || user.googleAccessEmail || decoded.email || "")
      .trim()
      .toLowerCase();

    if (!googleAccessEmail) {
      return NextResponse.json(
        { error: "Google access email required" },
        { status: 400 }
      );
    }

    const premiumVideoSnap = await adminDb
      .collection("videoItems")
      .where("accessTier", "==", "paid")
      .where("provider", "==", "drive")
      .get();

    const paidDriveIds = premiumVideoSnap.docs
      .map((doc) => doc.data().driveFileId)
      .filter((id): id is string => Boolean(id));

    const resourceIds = Array.from(
      new Set([...getConfiguredDriveResourceIds(), ...paidDriveIds])
    );

    await grantDriveAccessToEmail(googleAccessEmail, resourceIds);

    await userRef.update({
      googleAccessEmail,
      driveAccessSyncedAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      googleAccessEmail,
      grantedResources: resourceIds.length,
    });
  } catch (error) {
    console.error("Drive sync error:", error);
    return NextResponse.json(
      { error: "Failed to sync Drive access" },
      { status: 500 }
    );
  }
}
