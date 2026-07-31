import {
  cert,
  getApps,
  initializeApp,
  type App,
} from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";
import type { Bucket } from "@google-cloud/storage";

function normalizePrivateKey(value: string | undefined): string {
  return value?.replace(/\\n/g, "\n") ?? "";
}

function getFirebaseAdminApp(): App {
  const existingApp = getApps()[0];

  if (existingApp) {
    return existingApp;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const privateKey = normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY);
  const storageBucket = process.env.FIREBASE_STORAGE_BUCKET?.trim();

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error(
      "Firebase Admin is not configured. Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, or FIREBASE_PRIVATE_KEY.",
    );
  }

  return initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
    ...(storageBucket ? { storageBucket } : {}),
  });
}

export function getAdminAuth() {
  return getAuth(getFirebaseAdminApp());
}

export function getAdminDb() {
  return getFirestore(getFirebaseAdminApp());
}

export function getAdminMessaging() {
  return getMessaging(getFirebaseAdminApp());
}

export function getAdminStorage() {
  return getStorage(getFirebaseAdminApp());
}

let resolvedAdminStorageBucketPromise: Promise<Bucket> | null = null;

export async function getResolvedAdminStorageBucket() {
  if (!resolvedAdminStorageBucketPromise) {
    resolvedAdminStorageBucketPromise = (async () => {
      const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "";
      const configuredBucket = process.env.FIREBASE_STORAGE_BUCKET?.trim() || "";
      const candidates = Array.from(
        new Set(
          [
            configuredBucket,
            projectId ? `${projectId}.firebasestorage.app` : "",
            projectId ? `${projectId}.appspot.com` : "",
          ].filter(Boolean),
        ),
      );

      for (const name of candidates) {
        const bucket = getAdminStorage().bucket(name);
        try {
          const [exists] = await bucket.exists();
          if (exists) {
            return bucket;
          }
        } catch {
          // Try the next candidate.
        }
      }

      throw new Error(
        `No Firebase Storage bucket found. Checked: ${candidates.join(", ") || "none"}. Update FIREBASE_STORAGE_BUCKET to an existing bucket.`,
      );
    })();
  }

  return resolvedAdminStorageBucketPromise;
}
