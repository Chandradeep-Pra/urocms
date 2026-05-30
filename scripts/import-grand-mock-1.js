const fs = require("fs");
const path = require("path");
const admin = require("firebase-admin");

function stripWrappingQuotes(value) {
  const trimmed = String(value ?? "").trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function normalizePrivateKey(value) {
  const normalized = String(value ?? "").replace(/\\n/g, "\n").trim();

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
  const text = fs.readFileSync(filepath, "utf8");
  const values = {};

  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.+)$/);
    if (!match) continue;
    const [, key, rawValue] = match;
    values[key] = stripWrappingQuotes(rawValue);
  }

  return values;
}

function getEnvValues() {
  const envPath = path.join(process.cwd(), ".env.local");
  const fileEnv = fs.existsSync(envPath) ? parseEnvFile(envPath) : {};
  return {
    FIREBASE_PROJECT_ID: process.env.FIREBASE_PROJECT_ID || fileEnv.FIREBASE_PROJECT_ID,
    FIREBASE_CLIENT_EMAIL: process.env.FIREBASE_CLIENT_EMAIL || fileEnv.FIREBASE_CLIENT_EMAIL,
    FIREBASE_PRIVATE_KEY: process.env.FIREBASE_PRIVATE_KEY || fileEnv.FIREBASE_PRIVATE_KEY,
  };
}

function ensureAdmin() {
  if (admin.apps.length) {
    return admin.firestore();
  }

  const env = getEnvValues();
  if (!env.FIREBASE_PROJECT_ID || !env.FIREBASE_CLIENT_EMAIL || !env.FIREBASE_PRIVATE_KEY) {
    throw new Error("Missing Firebase admin credentials in environment or .env.local");
  }

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: env.FIREBASE_PROJECT_ID,
      clientEmail: env.FIREBASE_CLIENT_EMAIL,
      privateKey: normalizePrivateKey(env.FIREBASE_PRIVATE_KEY),
    }),
  });

  return admin.firestore();
}

function parseArgs(argv) {
  const args = {
    section: "section2",
    title: "Grand Mock - 1",
    file: path.join(process.cwd(), "jsonMockExamData", "grandMock.json"),
  };

  argv.forEach((arg) => {
    if (arg.startsWith("--section=")) {
      args.section = arg.split("=")[1] || args.section;
    } else if (arg.startsWith("--title=")) {
      args.title = arg.split("=").slice(1).join("=") || args.title;
    } else if (arg.startsWith("--file=")) {
      args.file = arg.split("=").slice(1).join("=") || args.file;
    }
  });

  return args;
}

function toCorrectAnswerIndex(value) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.max(0, Math.min(4, value));
  }

  const normalized = String(value ?? "").trim().toUpperCase();
  const labels = ["A", "B", "C", "D", "E"];
  const index = labels.indexOf(normalized);
  return index >= 0 ? index : 0;
}

async function resolveBank(db, title, section) {
  const existingSnap = await db
    .collection("questionBanks")
    .where("title", "==", title)
    .where("section", "==", section)
    .limit(1)
    .get();

  if (!existingSnap.empty) {
    return existingSnap.docs[0].ref;
  }

  const bankRef = db.collection("questionBanks").doc();
  await bankRef.set({
    title,
    section,
    questionCount: 0,
    isActive: true,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return bankRef;
}

async function importQuestions() {
  const { section, title, file } = parseArgs(process.argv.slice(2));

  if (!["section1", "section2"].includes(section)) {
    throw new Error("Section must be section1 or section2");
  }

  if (!fs.existsSync(file)) {
    throw new Error(`JSON file not found: ${file}`);
  }

  const db = ensureAdmin();
  const raw = fs.readFileSync(file, "utf8");
  const records = JSON.parse(raw);

  if (!Array.isArray(records) || records.length === 0) {
    throw new Error("No question records found in JSON file");
  }

  const bankRef = await resolveBank(db, title, section);
  const existingQuestionsSnap = await db
    .collection("questions")
    .where("bankId", "==", bankRef.id)
    .where("isActive", "==", true)
    .get();

  const existingQuestionTexts = new Set(
    existingQuestionsSnap.docs.map((doc) =>
      String(doc.data()?.questionText || "").trim()
    )
  );

  const batch = db.batch();
  let createdCount = 0;
  let skippedCount = 0;
  let invalidCount = 0;

  records.forEach((item, index) => {
    const questionText = String(item?.question || "").trim();
    const options = Array.isArray(item?.options)
      ? item.options.map((option) => String(option || "").trim())
      : [];

    if (!questionText || options.length !== 5) {
      invalidCount += 1;
      console.warn(
        `Skipping invalid question at index ${index} (question_number: ${
          item?.question_number ?? "unknown"
        })`
      );
      return;
    }

    if (existingQuestionTexts.has(questionText)) {
      skippedCount += 1;
      return;
    }

    existingQuestionTexts.add(questionText);

    const firstSolution =
      Array.isArray(item?.solution) && item.solution.length > 0 ? item.solution[0] : {};

    const questionRef = db.collection("questions").doc();
    batch.set(questionRef, {
      bankId: bankRef.id,
      questionText,
      questionImage: String(item?.image || "").trim(),
      options,
      correctAnswer: toCorrectAnswerIndex(item?.correct_answer),
      explanation: {
        text: String(firstSolution?.explanation || "").trim(),
        image: String(firstSolution?.image || "").trim(),
      },
      difficulty: "medium",
      tags: ["grand-mock", "imported", "grand-mock-1"],
      sourceQuestionNumber: Number(item?.question_number || index + 1),
      isActive: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    createdCount += 1;
  });

  if (createdCount > 0) {
    batch.update(bankRef, {
      questionCount: existingQuestionsSnap.size + createdCount,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await batch.commit();
  } else {
    await bankRef.set(
      {
        questionCount: existingQuestionsSnap.size,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  }

  console.log(`Question bank: ${title} (${section})`);
  console.log(`Bank ID: ${bankRef.id}`);
  console.log(`Imported: ${createdCount}`);
  console.log(`Skipped duplicates: ${skippedCount}`);
  console.log(`Skipped invalid rows: ${invalidCount}`);
  console.log(`Total active questions in bank: ${existingQuestionsSnap.size + createdCount}`);
}

importQuestions()
  .then(() => {
    console.log("Grand Mock import complete");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Grand Mock import failed");
    console.error(error);
    process.exit(1);
  });
