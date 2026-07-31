import { FieldValue } from "firebase-admin/firestore";
import { getAdminDb } from "@/lib/firebaseAdmin";

export type DevicePlatform = "android" | "ios" | "web" | "unknown";

function normalizePlatform(value: unknown): DevicePlatform {
  return value === "android" || value === "ios" || value === "web"
    ? value
    : "unknown";
}

export function getAppDevicesCollection() {
  return getAdminDb().collection("appDevices");
}

export async function registerDeviceToken(params: {
  uid: string;
  token: string;
  platform?: unknown;
  appVersion?: unknown;
  deviceName?: unknown;
}) {
  const token = String(params.token || "").trim();
  if (!token) {
    throw new Error("FCM token is required");
  }

  const platform = normalizePlatform(params.platform);
  const appVersion = String(params.appVersion || "").trim() || null;
  const deviceName = String(params.deviceName || "").trim() || null;
  const snapshot = await getAppDevicesCollection()
    .where("uid", "==", params.uid)
    .where("token", "==", token)
    .limit(1)
    .get();

  if (!snapshot.empty) {
    const ref = snapshot.docs[0].ref;
    await ref.set(
      {
        platform,
        appVersion,
        deviceName,
        isActive: true,
        updatedAt: FieldValue.serverTimestamp(),
        lastSeenAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    return { id: ref.id, created: false };
  }

  const docRef = await getAppDevicesCollection().add({
    uid: params.uid,
    token,
    platform,
    appVersion,
    deviceName,
    isActive: true,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
    lastSeenAt: FieldValue.serverTimestamp(),
  });

  return { id: docRef.id, created: true };
}

export async function unregisterDeviceToken(params: { uid: string; token: string }) {
  const token = String(params.token || "").trim();
  if (!token) {
    throw new Error("FCM token is required");
  }

  const snapshot = await getAppDevicesCollection()
    .where("uid", "==", params.uid)
    .where("token", "==", token)
    .limit(1)
    .get();

  if (snapshot.empty) {
    return { success: true, found: false };
  }

  await snapshot.docs[0].ref.set(
    {
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  return { success: true, found: true };
}

export async function listActiveDeviceTokens(limit = 500) {
  const snapshot = await getAppDevicesCollection()
    .where("isActive", "==", true)
    .limit(limit)
    .get();

  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as {
      uid: string;
      token: string;
      platform?: DevicePlatform;
    }),
  }));
}

export async function deactivateDeviceTokenByValue(token: string) {
  const normalizedToken = String(token || "").trim();
  if (!normalizedToken) return;

  const snapshot = await getAppDevicesCollection()
    .where("token", "==", normalizedToken)
    .limit(1)
    .get();

  if (snapshot.empty) return;

  await snapshot.docs[0].ref.set(
    {
      isActive: false,
      updatedAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}
