import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

function normalizePrivateKey(privateKey = "") {
  const unescaped = privateKey.replace(/\\n/g, "\n").trim();

  if (!unescaped) return "";
  if (unescaped.includes("\n")) return unescaped;

  return unescaped
    .replace("-----BEGIN PRIVATE KEY-----", "-----BEGIN PRIVATE KEY-----\n")
    .replace("-----END PRIVATE KEY-----", "\n-----END PRIVATE KEY-----");
}

function loadEnvFile(filePath) {
  const env = {};

  if (!fs.existsSync(filePath)) {
    throw new Error(`Missing env file: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    let value = trimmed.slice(separatorIndex + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    env[key] = value;
  }

  return env;
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const env = loadEnvFile(path.join(rootDir, ".env.local"));

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(env.FIREBASE_PRIVATE_KEY),
    }),
    storageBucket: env.FIREBASE_STORAGE_BUCKET,
  });
}

const adminAuth = getAuth();
const adminDb = getFirestore();
const now = new Date();

const seedUsers = [
  {
    uid: "seed-guest-1",
    tier: "guest",
    name: "Guest Seed 1",
    email: "seed.guest.1@urologics.local",
    source: "anonymous",
  },
  {
    uid: "seed-guest-2",
    tier: "guest",
    name: "Guest Seed 2",
    email: "seed.guest.2@urologics.local",
    source: "anonymous",
  },
  {
    uid: "seed-guest-3",
    tier: "guest",
    name: "Guest Seed 3",
    email: "seed.guest.3@urologics.local",
    source: "anonymous",
  },
  {
    uid: "seed-free-1",
    tier: "free",
    name: "Free Seed 1",
    email: "seed.free.1@urologics.local",
    password: "SeedUser@123",
    source: "password",
  },
  {
    uid: "seed-free-2",
    tier: "free",
    name: "Free Seed 2",
    email: "seed.free.2@urologics.local",
    password: "SeedUser@123",
    source: "password",
  },
  {
    uid: "seed-free-3",
    tier: "free",
    name: "Free Seed 3",
    email: "seed.free.3@urologics.local",
    password: "SeedUser@123",
    source: "password",
  },
  {
    uid: "seed-paid-1",
    tier: "paid",
    name: "Paid Seed 1",
    email: "seed.paid.1@urologics.local",
    password: "SeedUser@123",
    phone: "+910000000001",
    googleAccessEmail: "seed.paid.1@urologics.local",
    source: "password",
  },
  {
    uid: "seed-paid-2",
    tier: "paid",
    name: "Paid Seed 2",
    email: "seed.paid.2@urologics.local",
    password: "SeedUser@123",
    phone: "+910000000002",
    googleAccessEmail: "seed.paid.2@urologics.local",
    source: "password",
  },
  {
    uid: "seed-paid-3",
    tier: "paid",
    name: "Paid Seed 3",
    email: "seed.paid.3@urologics.local",
    password: "SeedUser@123",
    phone: "+910000000003",
    googleAccessEmail: "seed.paid.3@urologics.local",
    source: "password",
  },
];

async function ensureAuthUser(user) {
  try {
    await adminAuth.getUser(user.uid);

    const updatePayload = {
      displayName: user.name,
      disabled: false,
    };

    if (user.tier !== "guest") {
      updatePayload.email = user.email;
      updatePayload.password = user.password;
      updatePayload.emailVerified = true;
    }

    await adminAuth.updateUser(user.uid, updatePayload);
    return "updated";
  } catch (error) {
    if (error?.code !== "auth/user-not-found") {
      throw error;
    }

    const createPayload = {
      uid: user.uid,
      displayName: user.name,
      disabled: false,
    };

    if (user.tier !== "guest") {
      createPayload.email = user.email;
      createPayload.password = user.password;
      createPayload.emailVerified = true;
    }

    await adminAuth.createUser(createPayload);
    return "created";
  }
}

async function ensureFirestoreUser(user) {
  const docRef = adminDb.collection("users").doc(user.uid);
  const payload = {
    name: user.name,
    email: user.email,
    tier: user.tier,
    source: user.source,
    createdAt: now.toISOString(),
    ...(user.phone ? { phone: user.phone } : {}),
    ...(user.googleAccessEmail ? { googleAccessEmail: user.googleAccessEmail } : {}),
    ...(user.tier === "paid" ? { upgradedAt: now.toISOString() } : {}),
  };

  await docRef.set(payload, { merge: true });
}

async function main() {
  const results = [];

  for (const user of seedUsers) {
    const authStatus = await ensureAuthUser(user);
    await ensureFirestoreUser(user);
    results.push(`${user.uid} (${user.tier}) auth:${authStatus} firestore:upserted`);
  }

  console.log("Seed complete.");
  for (const line of results) {
    console.log(`- ${line}`);
  }
  console.log("Shared password for free/paid users: SeedUser@123");
}

main().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
