import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { requireAppUser } from "@/lib/server/appSession";

function getLocalPhoneDigits(phone: string) {
  const trimmedPhone = phone.trim();

  if (trimmedPhone.startsWith("+")) {
    const [, ...localParts] = trimmedPhone.split(/\s+/);
    return localParts.join("").replace(/\D/g, "");
  }

  return trimmedPhone.replace(/\D/g, "");
}

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
      const phone = String(body.phone || "").trim();
      if (phone && getLocalPhoneDigits(phone).length !== 10) {
        return NextResponse.json(
          { error: "Phone number should be exactly 10 digits" },
          { status: 400 }
        );
      }
      updates.phone = phone;
    }

    if (body?.country !== undefined) {
      updates.country = String(body.country || "").trim();
    }

    if (body?.medicalInstitution !== undefined) {
      updates.medicalInstitution = String(body.medicalInstitution || "").trim();
    }

    if (body?.profileImageUrl !== undefined) {
      const profileImageUrl = String(body.profileImageUrl || "").trim();
      updates.profileImageUrl = profileImageUrl || null;
    }

    const canonicalRef = adminDb.collection("users").doc(auth.user.uid);
    const authRef =
      auth.user.authUid && auth.user.authUid !== auth.user.uid
        ? adminDb.collection("users").doc(auth.user.authUid)
        : null;

    

    await canonicalRef.set(updates, { merge: true });

    if (authRef) {
      await authRef.set(
        {
          ...updates,
          canonicalUserId: auth.user.uid,
        },
        { merge: true }
      );
    }

    const updatedDoc = await canonicalRef.get();
    const updatedData = updatedDoc.data() ?? {};

    return NextResponse.json({
      success: true,
      profile: {
        authUid: auth.user.authUid,
        uid: auth.user.uid,
        email: updatedData.email ?? auth.user.email,
        name: updatedData.name ?? auth.user.name,
        profileImageUrl:
          typeof updatedData.profileImageUrl === "string" && updatedData.profileImageUrl.trim()
            ? updatedData.profileImageUrl.trim()
            : null,
        phone: updatedData.phone ?? null,
        country: updatedData.country ?? null,
        medicalInstitution: updatedData.medicalInstitution ?? null,
        tier: updatedData.tier ?? auth.user.tier,
      },
    });
  } catch (error) {
    console.error("App profile update error:", error);
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }
}
