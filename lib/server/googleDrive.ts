import { createSign } from "crypto";
import { normalizePrivateKey } from "@/lib/server/credentials";

const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_DRIVE_API_BASE = "https://www.googleapis.com/drive/v3";
const GOOGLE_DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

let cachedToken: { accessToken: string; expiresAt: number } | null = null;

function getServiceAccountEmail() {
  return (
    process.env.GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL ||
    process.env.FIREBASE_CLIENT_EMAIL ||
    ""
  );
}

function getServiceAccountPrivateKey() {
  return normalizePrivateKey(
    process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY ||
      process.env.FIREBASE_PRIVATE_KEY ||
      ""
  );
}

function base64UrlEncode(input: string | Buffer) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function createSignedJwt() {
  const clientEmail = getServiceAccountEmail();
  const privateKey = getServiceAccountPrivateKey();

  if (!clientEmail || !privateKey) {
    throw new Error("Missing Google service account credentials");
  }

  const now = Math.floor(Date.now() / 1000);

  const header = {
    alg: "RS256",
    typ: "JWT",
  };

  const payload = {
    iss: clientEmail,
    scope: GOOGLE_DRIVE_SCOPE,
    aud: GOOGLE_TOKEN_URL,
    exp: now + 3600,
    iat: now,
  };

  const encodedHeader = base64UrlEncode(JSON.stringify(header));
  const encodedPayload = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = createSign("RSA-SHA256");
  signer.update(signingInput);
  signer.end();

  const signature = signer.sign(privateKey);
  return `${signingInput}.${base64UrlEncode(signature)}`;
}

async function getDriveAccessToken() {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 60_000) {
    return cachedToken.accessToken;
  }

  const assertion = createSignedJwt();

  const response = await fetch(GOOGLE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to get Google access token: ${errorText}`);
  }

  const data = await response.json();
  cachedToken = {
    accessToken: data.access_token,
    expiresAt: Date.now() + Number(data.expires_in || 3600) * 1000,
  };

  return cachedToken.accessToken;
}

export function getConfiguredDriveResourceIds() {
  return (process.env.GOOGLE_DRIVE_PREMIUM_RESOURCE_IDS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function grantDriveReaderAccess(resourceId: string, emailAddress: string) {
  const accessToken = await getDriveAccessToken();

  const response = await fetch(`${GOOGLE_DRIVE_API_BASE}/files/${resourceId}/permissions?supportsAllDrives=true&sendNotificationEmail=false`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "user",
      role: "reader",
      emailAddress,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to grant Drive access for ${resourceId}: ${errorText}`);
  }

  return response.json();
}

export async function grantDriveAccessToEmail(emailAddress: string, resourceIds: string[]) {
  if (!emailAddress || resourceIds.length === 0) return [];

  return Promise.all(resourceIds.map((resourceId) => grantDriveReaderAccess(resourceId, emailAddress)));
}
