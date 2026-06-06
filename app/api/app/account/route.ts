import { NextRequest, NextResponse } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { deleteAppAccount } from "@/lib/server/accountDeletionService";

export async function DELETE(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const authAgeSeconds =
      typeof auth.user.authTime === "number"
        ? Math.floor(Date.now() / 1000) - auth.user.authTime
        : null;

    if (authAgeSeconds === null || authAgeSeconds > 300) {
      return NextResponse.json(
        { error: "Please verify your password again before deleting your account." },
        { status: 401 }
      );
    }

    const result = await deleteAppAccount({
      authUid: auth.user.authUid,
      canonicalUid: auth.user.uid,
      email: auth.user.email,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("App account deletion error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
