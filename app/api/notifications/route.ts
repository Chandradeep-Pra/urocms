import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";
import {
  listAdminPaymentQueryNotifications,
  listPublishedNotifications,
  publishNotification,
} from "@/lib/server/notificationService";

export async function GET(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const [notifications, paymentQueries] = await Promise.all([
      listPublishedNotifications(100),
      listAdminPaymentQueryNotifications(100),
    ]);
    return NextResponse.json({ notifications, paymentQueries });
  } catch (error) {
    console.error("Notifications fetch error:", error);
    return NextResponse.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const body = await req.json();
    const result = await publishNotification({
      kind: "custom",
      title: String(body?.title || "").trim(),
      body: String(body?.body || "").trim(),
      deepLink: body?.deepLink ? String(body.deepLink).trim() : null,
      sourceType: "custom",
      audience: "all",
    });

    return NextResponse.json({ success: true, id: result.id });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to publish notification";
    return NextResponse.json(
      { error: message },
      { status: message === "Notification title and body are required" ? 400 : 500 }
    );
  }
}
