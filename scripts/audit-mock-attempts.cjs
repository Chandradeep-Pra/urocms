#!/usr/bin/env node
// Read-only Firestore audit. Uses the application's actual ranking function.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { parseArgs, parseEnv } = require('node:util');
const ts = require('typescript');
const { initializeApp, cert, deleteApp } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getAuth } = require('firebase-admin/auth');

const ROOT = path.resolve(__dirname, '..');

function loadTs(file, modules = {}) {
  const exports = {};
  const filename = path.join(ROOT, file);
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    fileName: filename,
  }).outputText;
  vm.runInNewContext(code, { exports, Date, console, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected import in audit: ${name}`);
    return modules[name];
  } }, { filename });
  return exports;
}

function services(db, auth) {
  const helpers = loadTs('lib/server/mockAttempts.ts');
  const tracking = loadTs('lib/server/mockAttemptTracking.ts', {
    'node:crypto': require('node:crypto'), '@/lib/server/mockAttempts': helpers,
  });
  const service = loadTs('lib/server/mockService.ts', {
    '@/lib/firebaseAdmin': { getAdminDb: () => db, getAdminAuth: () => auth },
    '@/lib/server/mockAttempts': helpers,
    '@/lib/server/mockAttemptTracking': tracking,
    // getPublicMockResults never uses FieldValue or writes data.
    'firebase-admin/firestore': {},
  });
  return { ...helpers, getResults: id => service.getPublicMockResults(id, true) };
}

function iso(value) {
  if (value == null || value === '') return null;
  const date = typeof value.toDate === 'function' ? value.toDate() : new Date(value);
  return Number.isFinite(date.getTime()) ? date.toISOString() : null;
}

function local(value) {
  const utc = iso(value);
  return utc ? new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'long', hour12: false,
  }).format(new Date(utc)) : null;
}

function emailOf(attempt) {
  return String(attempt.candidate?.email || attempt.email || '').trim().toLowerCase();
}

function publicRecords(mockId, data) {
  return ['history', 'attempts'].flatMap(source =>
    (Array.isArray(data[source]) ? data[source] : []).map((attempt, index) => ({
      source: `mocks/${mockId}.${source}[${index}]`, attempt,
    })));
}

function recordRow(source, attempt, ranked) {
  const submittedAt = iso(attempt.createdAt || attempt.submittedAt);
  const seconds = attempt.timeTakenSeconds;
  return {
    source,
    storedAttemptNumber: attempt.attemptNumber ?? null,
    marks: attempt.marks ?? attempt.score ?? null,
    maxMarks: attempt.maxMarks ?? attempt.totalQuestions ?? null,
    createdAt: iso(attempt.createdAt),
    submittedAt: iso(attempt.submittedAt),
    timestampUTC: submittedAt,
    timestampIST: local(submittedAt),
    timeTakenSeconds: typeof seconds === 'number' && Number.isFinite(seconds) ? seconds : null,
    matchesRankedSubmission: submittedAt === iso(ranked.submittedAt) &&
      Number(attempt.marks ?? attempt.score) === ranked.marks,
  };
}

async function audit(db, auth, mockId, name) {
  const { getResults } = services(db, auth);
  const [snapshot, results] = await Promise.all([
    db.collection('mocks').doc(mockId).get(), getResults(mockId),
  ]);
  const data = snapshot.data();
  const matches = name ? results.results.filter(row => row.name.trim().toLowerCase() === name.trim().toLowerCase()) : results.results.slice(0, 1);
  if (matches.length !== 1) throw new Error(name ? `Expected one candidate named ${name}; found ${matches.length}.` : 'No ranked submissions in this test.');
  const candidate = matches[0];
  const records = publicRecords(mockId, data).filter(({ attempt }) => emailOf(attempt) === candidate.email);
  const uids = new Set(records.map(({ attempt }) => attempt.candidate?.uid).filter(Boolean));
  const warnings = [];
  try {
    const user = await auth.getUserByEmail(candidate.email);
    uids.add(user.uid);
  } catch (error) {
    if (error.code !== 'auth/user-not-found') throw error;
    warnings.push('No Firebase Auth user matches this email. Public submissions may have no private duration record.');
  }
  const rows = records.map(({ source, attempt }) => recordRow(source, attempt, candidate));
  for (const uid of uids) {
    const items = db.collection('mockAttempts').doc(uid).collection('items');
    const [byMock, deterministic] = await Promise.all([
      items.where('mockId', '==', mockId).get(), items.doc(mockId).get(),
    ]);
    const docs = new Map(byMock.docs.map(doc => [doc.id, doc]));
    if (deterministic.exists) docs.set(deterministic.id, deterministic);
    for (const doc of docs.values()) {
      rows.push(recordRow(doc.ref.path, doc.data(), candidate));
    }
  }
  rows.sort((a, b) => (Date.parse(a.timestampUTC) || Infinity) - (Date.parse(b.timestampUTC) || Infinity) || a.source.localeCompare(b.source));
  const earliest = rows.find(row => row.timestampUTC)?.timestampUTC ?? null;
  const rankedTime = iso(candidate.submittedAt);
  if (rows.some(row => !row.timestampUTC)) warnings.push('Some records have no valid timestamp; their chronological order cannot be verified.');
  if (earliest && rankedTime && earliest < rankedTime) warnings.push('An earlier saved record exists than the ranked submission. Investigate the discrepancy.');
  return {
    mock: results.mock,
    rank1: results.results[0],
    candidate,
    rankedSubmissionUTC: rankedTime,
    rankedSubmissionIST: local(rankedTime),
    rankedMatchesEarliestKnownTimestamp: earliest && rankedTime ? earliest === rankedTime : null,
    records: rows,
    warnings,
    limitation: 'Rows are saved records, not necessarily distinct tries: public and private records can describe the same submission. Current code rejects retakes without saving them. Deleted, overwritten, or rejected tries cannot be recovered here. Duration is only available when timeTakenSeconds was saved; start time is not recorded by the current submission route.',
  };
}

async function main(argv) {
  const { values } = parseArgs({ args: argv, options: {
    help: { type: 'boolean' }, list: { type: 'boolean' }, json: { type: 'boolean' },
    mock: { type: 'string' }, name: { type: 'string' }, 'env-file': { type: 'string' },
  } });
  if (values.help) {
    console.log(`Read-only mock attempt audit (no admin browser login required).
  node scripts/audit-mock-attempts.cjs --list
  node scripts/audit-mock-attempts.cjs [--mock TEST_ID] [--name "Arti yadav"] [--json]
  node scripts/audit-mock-attempts.cjs --env-file .env.prod --list

Default: .env.local, with existing process environment taking precedence.
Default test: latest started test with saved submissions among the 20 latest schedules.
Prints all saved records for this candidate in this test, with UTC/IST and saved duration.
Requires FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.`);
    return;
  }
  const envPath = path.resolve(ROOT, values['env-file'] || '.env.local');
  if (values['env-file'] && !fs.existsSync(envPath)) throw new Error('Specified env file does not exist.');
  const fileEnv = fs.existsSync(envPath) ? parseEnv(fs.readFileSync(envPath, 'utf8')) : {};
  const env = { ...fileEnv, ...process.env };
  for (const key of ['FIREBASE_PROJECT_ID', 'FIREBASE_CLIENT_EMAIL', 'FIREBASE_PRIVATE_KEY']) {
    if (!env[key]?.trim()) throw new Error(`Missing ${key}. Configure the server credentials in the env file or process environment.`);
  }
  const app = initializeApp({ credential: cert({
    projectId: env.FIREBASE_PROJECT_ID.trim(), clientEmail: env.FIREBASE_CLIENT_EMAIL.trim(),
    privateKey: env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
  }) }, 'read-only-mock-audit');
  const db = getFirestore(app);
  try {
    let mockId = values.mock;
    if (!mockId || values.list) {
      const snapshot = await db.collection('mocks').orderBy('startTime', 'desc').limit(20)
        .select('title', 'startTime', 'endTime', 'attempts', 'history').get();
      const mocks = snapshot.docs.map(doc => {
        const data = doc.data();
        return { id: doc.id, title: data.title, startTimeUTC: iso(data.startTime),
          startTimeIST: local(data.startTime), savedPublicRecords: publicRecords(doc.id, data).length };
      });
      if (values.list) {
        if (values.json) console.log(JSON.stringify(mocks, null, 2));
        else console.table(mocks);
        return;
      }
      mockId = mocks.find(mock => mock.savedPublicRecords && mock.startTimeUTC && Date.parse(mock.startTimeUTC) <= Date.now())?.id;
      if (!mockId) throw new Error('No started test with submissions in the latest 20 schedules. Use --mock TEST_ID.');
    }
    const report = await audit(db, getAuth(app), mockId, values.name);
    if (values.json) console.log(JSON.stringify(report, null, 2));
    else {
      console.log(`Test: ${report.mock.title} (${mockId})`);
      console.log(`Rank 1: ${report.rank1.name}, ${report.rank1.marks} marks`);
      console.log(`Auditing: ${report.candidate.name}, rank ${report.candidate.rank}, ${report.candidate.marks} marks`);
      console.log(`Ranked submission: ${report.rankedSubmissionIST || 'unknown'} (${report.rankedSubmissionUTC || 'unknown'})`);
      console.log(`Ranked time equals earliest known saved time: ${report.rankedMatchesEarliestKnownTimestamp ?? 'unknown'}`);
      console.table(report.records);
      report.warnings.forEach(warning => console.log(`Warning: ${warning}`));
      console.log(report.limitation);
    }
  } finally {
    await db.terminate();
    await deleteApp(app);
  }
}

module.exports = { services, audit, iso, recordRow };
if (require.main === module) {
  const timeout = setTimeout(() => {
    console.error('Audit timed out after 60 seconds. Check network access to Firebase. No writes were performed.');
    process.exit(1);
  }, 60_000);
  timeout.unref();
  main(process.argv.slice(2)).catch(error => {
    // Do not dump SDK objects or credentials into logs.
    console.error(`Audit failed (${error.code || error.name || 'error'}). ${
      /^(Missing |Specified |No |Expected |Unexpected )/.test(error.message || '') ? error.message : 'Check credentials, Firestore/Auth read permissions, and network access.'}`);
    process.exitCode = 1;
  }).finally(() => clearTimeout(timeout));
}
