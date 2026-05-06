import { Storage } from "@google-cloud/storage";
import type { Bucket } from "@google-cloud/storage";
import { normalizePrivateKey } from "@/lib/server/credentials";

type ServiceAccountJson = {
  project_id?: string;
  client_email?: string;
  private_key?: string;
};

let storageClient: Storage | null = null;
let resolvedBucketPromise: Promise<Bucket> | null = null;

function parseServiceAccountJson(): ServiceAccountJson | null {
  const raw = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON?.trim();
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as ServiceAccountJson;
    return parsed;
  } catch {
    throw new Error("GOOGLE_APPLICATION_CREDENTIALS_JSON is not valid JSON");
  }
}

function getBucketName() {
  return (
    process.env.GOOGLE_CLOUD_STORAGE_BUCKET?.trim() ||
    process.env.FIREBASE_STORAGE_BUCKET?.trim() ||
    ""
  )
    .replace(/^gs:\/\//, "")
    .replace(/\/+$/, "");
}

function getStorageClient() {
  if (storageClient) return storageClient;

  const serviceAccount = parseServiceAccountJson();
  if (!serviceAccount?.project_id || !serviceAccount?.client_email || !serviceAccount?.private_key) {
    throw new Error(
      "Missing Google Cloud credentials. Set GOOGLE_APPLICATION_CREDENTIALS_JSON with project_id, client_email, and private_key."
    );
  }

  storageClient = new Storage({
    projectId: serviceAccount.project_id,
    credentials: {
      client_email: serviceAccount.client_email,
      private_key: normalizePrivateKey(serviceAccount.private_key),
    },
  });

  return storageClient;
}

export async function getResolvedGoogleCloudStorageBucket() {
  if (!resolvedBucketPromise) {
    resolvedBucketPromise = (async () => {
      const bucketName = getBucketName();
      if (!bucketName) {
        throw new Error(
          "Missing storage bucket configuration. Set GOOGLE_CLOUD_STORAGE_BUCKET or FIREBASE_STORAGE_BUCKET."
        );
      }

      const bucket = getStorageClient().bucket(bucketName);
      const [exists] = await bucket.exists();

      if (!exists) {
        throw new Error(
          `Configured Cloud Storage bucket does not exist or is not accessible: ${bucketName}`
        );
      }

      return bucket;
    })();
  }

  return resolvedBucketPromise;
}

export function sanitizeStoragePathPart(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9.-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export async function getCloudStorageSignedReadUrl(input: {
  storagePath: string;
  mimeType?: string;
  storageBucket?: string;
}) {
  const bucket = input.storageBucket
    ? getStorageClient().bucket(input.storageBucket)
    : await getResolvedGoogleCloudStorageBucket();

  const [url] = await bucket.file(input.storagePath).getSignedUrl({
    action: "read",
    expires: Date.now() + 1000 * 60 * 15,
    responseDisposition: "inline",
    ...(input.mimeType ? { responseType: input.mimeType } : {}),
  });

  return {
    url,
    bucket: bucket.name,
  };
}

export async function deleteCloudStorageObject(input: {
  storagePath?: string | null;
  storageBucket?: string | null;
}) {
  if (!input.storagePath) {
    return { deleted: false, reason: "missing-storage-path" as const };
  }

  const bucket = input.storageBucket
    ? getStorageClient().bucket(input.storageBucket)
    : await getResolvedGoogleCloudStorageBucket();

  const file = bucket.file(input.storagePath);
  const [exists] = await file.exists();

  if (!exists) {
    return { deleted: false, reason: "not-found" as const };
  }

  await file.delete();
  return { deleted: true, reason: "deleted" as const };
}
