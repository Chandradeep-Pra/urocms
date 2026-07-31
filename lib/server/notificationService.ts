import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb, getAdminMessaging } from "@/lib/firebaseAdmin";
import {
  deactivateDeviceTokenByValue,
  listActiveDeviceTokens,
} from "@/lib/server/deviceTokenService";

export type NotificationKind =
  | "daily-quiz"
  | "grand-mock"
  | "ai-viva"
  | "announcement"
  | "custom";

export type NotificationPayload = {
  kind: NotificationKind;
  title: string;
  body: string;
  sourceId?: string | null;
  sourceType?: string | null;
  deepLink?: string | null;
  audience?: "all";
};

function sanitizeText(value: unknown) {
  return String(value || "").trim();
}

async function sendPushForNotification(params: {
  title: string;
  body: string;
  deepLink?: string | null;
  notificationId: string;
}) {
  const devices = await listActiveDeviceTokens(500);
  const tokens = Array.from(
    new Set(
      devices
        .map((device) => String(device.token || "").trim())
        .filter(Boolean)
    )
  );

  if (!tokens.length) {
    return {
      sentCount: 0,
      failureCount: 0,
      invalidatedTokens: 0,
    };
  }

  const response = await getAdminMessaging().sendEachForMulticast({
    tokens,
    notification: {
      title: params.title,
      body: params.body,
    },
    data: {
      notificationId: params.notificationId,
      deepLink: params.deepLink || "",
      title: params.title,
      body: params.body,
    },
    android: {
      priority: "high",
    },
    apns: {
      payload: {
        aps: {
          sound: "default",
        },
      },
    },
  });

  let invalidatedTokens = 0;

  await Promise.all(
    response.responses.map(async (item, index) => {
      if (item.success) return;

      const code = item.error?.code || "";
      if (
        code === "messaging/registration-token-not-registered" ||
        code === "messaging/invalid-registration-token"
      ) {
        invalidatedTokens += 1;
        await deactivateDeviceTokenByValue(tokens[index]);
      }
    })
  );

  return {
    sentCount: response.successCount,
    failureCount: response.failureCount,
    invalidatedTokens,
  };
}

export async function publishNotification(input: NotificationPayload) {
  const title = sanitizeText(input.title);
  const body = sanitizeText(input.body);

  if (!title || !body) {
    throw new Error("Notification title and body are required");
  }

  const docRef = await getAdminDb().collection("notifications").add({
    kind: input.kind,
    title,
    body,
    sourceId: input.sourceId ? sanitizeText(input.sourceId) : null,
    sourceType: input.sourceType ? sanitizeText(input.sourceType) : null,
    deepLink: input.deepLink ? sanitizeText(input.deepLink) : null,
    audience: input.audience ?? "all",
    isPublished: true,
    publishedAt: FieldValue.serverTimestamp(),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  try {
    const pushResult = await sendPushForNotification({
      title,
      body,
      deepLink: input.deepLink ? sanitizeText(input.deepLink) : null,
      notificationId: docRef.id,
    });

    await docRef.set(
      {
        pushDelivery: {
          sentCount: pushResult.sentCount,
          failureCount: pushResult.failureCount,
          invalidatedTokens: pushResult.invalidatedTokens,
          attemptedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Notification push delivery error:", error);
    await docRef.set(
      {
        pushDelivery: {
          sentCount: 0,
          failureCount: 1,
          invalidatedTokens: 0,
          error: error instanceof Error ? error.message : "Push delivery failed",
          attemptedAt: FieldValue.serverTimestamp(),
        },
      },
      { merge: true }
    );
  }

  return { id: docRef.id };
}

export async function listPublishedNotifications(limit = 50) {
  const snapshot = await getAdminDb()
    .collection("notifications")
    .where("isPublished", "==", true)
    .orderBy("publishedAt", "desc")
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));
}
