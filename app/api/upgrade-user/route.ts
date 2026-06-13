import { NextRequest, NextResponse } from "next/server";
import {
  getConfiguredDriveResourceIds,
  grantDriveAccessToEmail,
} from "@/lib/server/googleDrive";
import { completeAppUserProfile } from "@/lib/server/appOnboardingService";
import { requireAppUser } from "@/lib/server/appSession";

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAppUser(req);
    if ("response" in auth) return auth.response;

    const {
      name,
      phone,
      country,
      medicalInstitution,
      googleAccessEmail,
      profileImageUrl,
    } = await req.json();
    const upgradedUser = await completeAppUserProfile({
      uid: auth.user.uid,
      authEmail: auth.user.email,
      authName: auth.user.name,
      name,
      phone,
      country,
      medicalInstitution,
      googleAccessEmail,
      profileImageUrl,
    });

    const configuredResourceIds = getConfiguredDriveResourceIds();

    if (upgradedUser.googleAccessEmail && configuredResourceIds.length > 0) {
      await grantDriveAccessToEmail(upgradedUser.googleAccessEmail, configuredResourceIds);
    }

    return NextResponse.json({
      success: true,
      tier: upgradedUser.tier,
      googleAccessEmail: upgradedUser.googleAccessEmail,
      driveAccessGranted:
        Boolean(upgradedUser.googleAccessEmail) && configuredResourceIds.length > 0,
    });
  } catch (err) {
    console.error("Upgrade error:", err);
    return NextResponse.json(
      { error: "Failed to upgrade" },
      { status: 500 }
    );
  }
}
