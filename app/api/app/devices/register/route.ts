import { NextRequest, NextResponse } from "next/server";
import {
  registerDeviceToken,
  unregisterDeviceToken,
} from "@/lib/server/deviceTokenService";
import { requireAppUser } from "@/lib/server/appSession";

export async function POST(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const result = await registerDeviceToken({
      uid: auth.user.uid,
      token: body?.token,
      platform: body?.platform,
      appVersion: body?.appVersion,
      deviceName: body?.deviceName,
    });

    return NextResponse.json({
      success: true,
      deviceId: result.id,
      created: result.created,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to register device";
    return NextResponse.json(
      { error: message },
      { status: message === "FCM token is required" ? 400 : 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const body = await req.json();
    const result = await unregisterDeviceToken({
      uid: auth.user.uid,
      token: body?.token,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to unregister device";
    return NextResponse.json(
      { error: message },
      { status: message === "FCM token is required" ? 400 : 500 }
    );
  }
}
