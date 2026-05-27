const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function stripWrappingQuotes(value) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizePrivateKey(value) {
  const normalized = value.replace(/\\n/g, "\n").trim();

  if (
    normalized.includes("-----BEGIN PRIVATE KEY-----") &&
    normalized.includes("-----END PRIVATE KEY-----") &&
    !normalized.includes("\n")
  ) {
    const beginMarker = "-----BEGIN PRIVATE KEY-----";
    const endMarker = "-----END PRIVATE KEY-----";
    const base64 = normalized
      .replace(beginMarker, "")
      .replace(endMarker, "")
      .replace(/\s+/g, "");

    const chunks = base64.match(/.{1,64}/g) || [];
    return [beginMarker, ...chunks, endMarker].join("\n");
  }

  return normalized;
}

function parseEnvFile(filepath) {
  if (!fs.existsSync(filepath)) {
    throw new Error(`Env file not found: ${filepath}`);
  }

  const text = fs.readFileSync(filepath, "utf8");
  const active = {};
  const commented = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;

    if (line.startsWith("#")) {
      const uncommented = line.replace(/^#\s*/, "");
      const match = uncommented.match(/^([A-Z0-9_]+)\s*=\s*(.+)$/);
      if (!match) continue;
      const [, key, rawValue] = match;
      if (!(key in commented)) {
        commented[key] = stripWrappingQuotes(rawValue);
      }
      continue;
    }

    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.+)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    active[key] = stripWrappingQuotes(rawValue);
  }

  return { active, commented };
}

function readCredentialSet(env, prefix = "") {
  const projectId = env[`${prefix}FIREBASE_PROJECT_ID`];
  const clientEmail = env[`${prefix}FIREBASE_CLIENT_EMAIL`];
  const privateKey = env[`${prefix}FIREBASE_PRIVATE_KEY`];

  if (!projectId || !clientEmail || !privateKey) {
    return null;
  }

  return {
    projectId,
    clientEmail,
    privateKey: normalizePrivateKey(privateKey),
  };
}

function createApp(name, credentials) {
  return admin.initializeApp(
    {
      credential: admin.credential.cert({
        projectId: credentials.projectId,
        clientEmail: credentials.clientEmail,
        privateKey: credentials.privateKey,
      }),
      projectId: credentials.projectId,
    },
    name
  );
}

function parseArgs(argv) {
  const options = {
    collections: [],
    overwrite: false,
    dryRun: false,
    help: false,
    unknownArgs: [],
  };

  for (const arg of argv) {
    if (arg.startsWith("--collections=")) {
      options.collections = arg
        .slice("--collections=".length)
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean);
      continue;
    }

    if (arg === "--overwrite") {
      options.overwrite = true;
      continue;
    }

    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }

    if (arg === "--help" || arg === "-h" || arg.startsWith("--help")) {
      options.help = true;
      continue;
    }

    options.unknownArgs.push(arg);
  }

  return options;
}

function printHelp() {
  console.log(`
Firestore migration script

Usage:
  npm run migrate:firestore -- [--dry-run] [--overwrite] [--collections=users,courses]

Flags:
  --dry-run                  Scan and log without writing to target Firestore
  --overwrite                Replace existing destination documents
  --collections=a,b,c        Copy only selected top-level collections
  --help, -h                 Show this help

Credential resolution:
  Source project:
    1. OLD_FIREBASE_* env vars if set
    2. first commented FIREBASE_* admin block in .env.local

  Target project:
    active FIREBASE_* env vars in .env.local
`);
}

async function copyDocumentRecursive(sourceDocRef, targetDocRef, options, stats) {
  const sourceSnap = await sourceDocRef.get();
  if (!sourceSnap.exists) return;

  stats.documentsScanned += 1;
  const data = sourceSnap.data();
  const targetSnap = await targetDocRef.get();
  const exists = targetSnap.exists;

  if (!exists || options.overwrite) {
    if (!options.dryRun) {
      await targetDocRef.set(data, { merge: false });
    }
    stats.documentsWritten += 1;
  } else {
    stats.documentsSkipped += 1;
  }

  const subcollections = await sourceDocRef.listCollections();
  for (const subcollection of subcollections) {
    await copyCollectionRecursive(subcollection, targetDocRef.collection(subcollection.id), options, stats);
  }
}

async function copyCollectionRecursive(sourceCollectionRef, targetCollectionRef, options, stats) {
  const snapshot = await sourceCollectionRef.get();
  stats.collectionsVisited.add(sourceCollectionRef.path);

  for (const sourceDoc of snapshot.docs) {
    await copyDocumentRecursive(
      sourceCollectionRef.doc(sourceDoc.id),
      targetCollectionRef.doc(sourceDoc.id),
      options,
      stats
    );
  }
}

async function run() {
  const root = path.resolve(__dirname, "..");
  const envPath = path.join(root, ".env.local");
  const { active, commented } = parseEnvFile(envPath);
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  if (options.unknownArgs.length > 0) {
    throw new Error(
      `Unknown argument(s): ${options.unknownArgs.join(", ")}. Run with --help to see supported flags.`
    );
  }

  for (const [key, value] of Object.entries(active)) {
    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }

  const sourceEnv = {
    ...commented,
    ...Object.fromEntries(
      Object.entries(process.env)
        .filter(([key]) => key.startsWith("OLD_FIREBASE_"))
        .map(([key, value]) => [key, value])
    ),
  };

  const targetEnv = process.env;

  const sourceCredentials =
    readCredentialSet(sourceEnv, "OLD_") || readCredentialSet(sourceEnv, "");
  const targetCredentials = readCredentialSet(targetEnv, "");

  if (!sourceCredentials) {
    throw new Error(
      "Missing old Firebase Admin credentials. Set OLD_FIREBASE_PROJECT_ID, OLD_FIREBASE_CLIENT_EMAIL, OLD_FIREBASE_PRIVATE_KEY, or keep the old FIREBASE_* block commented in .env.local."
    );
  }

  if (!targetCredentials) {
    throw new Error(
      "Missing current Firebase Admin credentials. FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY must be active in .env.local."
    );
  }

  if (sourceCredentials.projectId === targetCredentials.projectId) {
    throw new Error(
      "Source and target Firestore project ids are identical. Check your commented old FIREBASE_* block and active current FIREBASE_* values in .env.local before running migration."
    );
  }

  const sourceApp = createApp("migration-source", sourceCredentials);
  const targetApp = createApp("migration-target", targetCredentials);
  const sourceDb = sourceApp.firestore();
  const targetDb = targetApp.firestore();

  const topLevelCollections = options.collections.length
    ? options.collections
    : (await sourceDb.listCollections()).map((collection) => collection.id);

  const stats = {
    collectionsVisited: new Set(),
    documentsScanned: 0,
    documentsWritten: 0,
    documentsSkipped: 0,
  };

  console.log("Firestore migration starting");
  console.log(`Source project: ${sourceCredentials.projectId}`);
  console.log(`Target project: ${targetCredentials.projectId}`);
  console.log(`Collections: ${topLevelCollections.join(", ") || "(none)"}`);
  console.log(`Mode: ${options.dryRun ? "dry-run" : options.overwrite ? "overwrite" : "copy-missing-only"}`);

  try {
    for (const collectionId of topLevelCollections) {
      console.log(`\nMigrating collection: ${collectionId}`);
      await copyCollectionRecursive(
        sourceDb.collection(collectionId),
        targetDb.collection(collectionId),
        options,
        stats
      );
    }

    console.log("\nMigration complete");
    console.log(`Visited collections: ${stats.collectionsVisited.size}`);
    console.log(`Documents scanned: ${stats.documentsScanned}`);
    console.log(`Documents written: ${stats.documentsWritten}`);
    console.log(`Documents skipped: ${stats.documentsSkipped}`);
  } finally {
    await Promise.all([sourceApp.delete(), targetApp.delete()]);
  }
}

run().catch((error) => {
  console.error("\nFirestore migration failed");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
