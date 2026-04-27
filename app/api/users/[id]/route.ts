import { NextRequest, NextResponse } from "next/server";
import { FieldValue } from "firebase-admin/firestore";
import { adminAuth, adminDb } from "@/lib/firebaseAdmin";
import {
  getConfiguredDriveResourceIds,
  grantDriveAccessToEmail,
} from "@/lib/server/googleDrive";

const allowedTiers = new Set(["guest", "free", "paid"]);

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await req.json();
    const tier = String(body?.tier ?? "");

    if (!allowedTiers.has(tier)) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const userRef = adminDb.collection("users").doc(id);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const user = userDoc.data() ?? {};
    const payload: Record<string, unknown> = {
      tier,
      updatedAt: new Date().toISOString(),
    };

    if (tier === "paid") {
      payload.upgradedAt = new Date().toISOString();
      payload.googleAccessEmail = user.googleAccessEmail ?? user.email ?? null;
    } else if ("upgradedAt" in user) {
      payload.upgradedAt = FieldValue.delete();
    }

    await userRef.set(payload, { merge: true });

    if (tier === "paid") {
      const googleAccessEmail = String(payload.googleAccessEmail ?? "").trim().toLowerCase();
      const resourceIds = getConfiguredDriveResourceIds();

      if (googleAccessEmail && resourceIds.length > 0) {
        await grantDriveAccessToEmail(googleAccessEmail, resourceIds);
      }
    }

    const updatedDoc = await userRef.get();
    const updatedUser = updatedDoc.data() ?? {};

    return NextResponse.json({
      success: true,
      user: {
        id,
        name: updatedUser.name ?? "",
        email: updatedUser.email ?? "",
        tier: updatedUser.tier ?? "guest",
        createdAt: updatedUser.createdAt ?? null,
        source: updatedUser.source ?? "mobile-app",
      },
    });
  } catch (error) {
    console.error("Update user tier error:", error);
    return NextResponse.json({ error: "Failed to update user tier" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    await adminDb.collection("users").doc(id).delete();

    try {
      await adminAuth.deleteUser(id);
    } catch (error: any) {
      if (error?.code !== "auth/user-not-found") {
        throw error;
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  }
}
