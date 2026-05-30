import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";

export async function PATCH(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const updates: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
    };

    if (body?.name !== undefined) {
      const name = String(body.name || "").trim();
      if (!name) {
        return NextResponse.json({ error: "Name cannot be empty" }, { status: 400 });
      }
      updates.name = name;
    }

    if (body?.phone !== undefined) {
      updates.phone = String(body.phone || "").trim();
    }

    if (body?.country !== undefined) {
      updates.country = String(body.country || "").trim();
    }

    if (body?.profileImageUrl !== undefined) {
      const profileImageUrl = String(body.profileImageUrl || "").trim();
      updates.profileImageUrl = profileImageUrl || null;
    }

    await adminDb.collection("users").doc(auth.user.uid).set(updates, { merge: true });

    const updatedDoc = await adminDb.collection("users").doc(auth.user.uid).get();
    const updatedData = updatedDoc.data() ?? {};

    return NextResponse.json({
      success: true,
      profile: {
        uid: auth.user.uid,
        email: updatedData.email ?? auth.user.email,
        name: updatedData.name ?? auth.user.name,
        profileImageUrl:
          typeof updatedData.profileImageUrl === "string" && updatedData.profileImageUrl.trim()
            ? updatedData.profileImageUrl.trim()
            : null,
        phone: updatedData.phone ?? null,
        country: updatedData.country ?? null,
        tier: updatedData.tier ?? auth.user.tier,
      },
    });
  } catch (error) {
    console.error("App profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
