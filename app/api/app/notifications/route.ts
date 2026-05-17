import { NextRequest, NextResponse } from "next/server";
import { requireAppUser } from "@/lib/server/appSession";
import { listPublishedNotifications } from "@/lib/server/notificationService";

export async function GET(req: NextRequest) {
  const auth = await requireAppUser(req);
  if ("response" in auth) return auth.response;

  try {
    const notifications = await listPublishedNotifications(50);
    return NextResponse.json({
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error("App notifications fetch error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}
