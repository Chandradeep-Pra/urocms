// lib/firebaseAdmin.ts

import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";
import type { Bucket } from "@google-cloud/storage";
import { normalizePrivateKey } from "@/lib/server/credentials";

// Prevent reinitialization during hot reload (Next.js dev)
if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  });
}

export const adminAuth = getAuth();
export const adminDb = getFirestore();
export const adminStorage = getStorage().bucket();

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
          ].filter(Boolean)
        )
      );

      for (const name of candidates) {
        const bucket = getStorage().bucket(name);
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
        `No Firebase Storage bucket found. Checked: ${candidates.join(", ") || "none"}. Update FIREBASE_STORAGE_BUCKET to an existing bucket.`
      );
    })();
  }

  return resolvedAdminStorageBucketPromise;
}
