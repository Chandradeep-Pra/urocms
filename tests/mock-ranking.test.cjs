const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Date, console, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
    return modules[name];
  } });
  return exports;
}
const helpers = load('lib/server/mockAttempts.ts');
const candidate = (email, marks, createdAt, extra = {}) => ({ candidate: { email, name: email }, marks, createdAt, ...extra });

function fixture(mock = {}) {
  const records = { 'mocks/test': { accessType: 'public', title: 'Test', attempts: [], ...mock } };
  const writes = [];
  const ref = key => ({ key, get: async () => snapshot(key) });
  const snapshot = key => ({ exists: key in records, data: () => records[key] });
  const db = {
    collection: name => ({ doc: id => ref(`${name}/${id}`) }),
    runTransaction: async run => run({
      get: async reference => snapshot(reference.key),
      update: (reference, value) => { writes.push(reference.key); records[reference.key] = { ...records[reference.key], ...value }; },
      set: (reference, value) => { writes.push(reference.key); records[reference.key] = value; },
    }),
  };
  const modules = { '@/lib/firebaseAdmin': { getAdminDb: () => db }, 'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'timestamp' } }, '@/lib/server/mockAttempts': helpers };
  return { records, writes, modules, service: load('lib/server/mockService.ts', modules) };
}

test('first attempts recover archived original scores and normalize candidate emails', () => {
  const first = candidate('One@example.test', 2, '2026-01-01T10:00:00Z');
  const later = candidate('one@example.test', 9, '2026-01-02T10:00:00Z');
  const selected = helpers.firstMockAttempts([later], [first]);
  assert.equal(selected.length, 1);
  assert.equal(selected[0].marks, 2);
});

test('public retakes and duplicate requests preserve the first score and timestamp', async () => {
  const f = fixture();
  const first = await f.service.addPublicMockAttempt('test', { name: 'One', email: 'one@example.test', marks: 2, totalQuestions: 10 });
  const second = await f.service.addPublicMockAttempt('test', { name: 'One', email: 'ONE@example.test', marks: 9, totalQuestions: 10 });
  assert.equal(second.attempt.marks, 2);
  assert.equal(second.attempt.createdAt, first.attempt.createdAt);
  assert.equal(second.alreadyRecorded, true);
  assert.equal(f.records['mocks/test'].attempts.length, 1);
  assert.equal(f.writes.length, 1);
});

test('results rank original scores in descending order with earlier submission winning ties', async () => {
  const f = fixture({
    attempts: [candidate('one@example.test', 10, '2026-01-03T10:00:00Z'), candidate('two@example.test', 7, '2026-01-02T10:00:00Z'), candidate('three@example.test', 7, '2026-01-01T10:00:00Z')],
    history: [candidate('one@example.test', 2, '2025-12-31T10:00:00Z')],
  });
  const result = await f.service.getPublicMockResults('test');
  assert.deepEqual(Array.from(result.results, row => [row.rank, row.email, row.marks]), [[1, 'three@example.test', 7], [2, 'two@example.test', 7], [3, 'one@example.test', 2]]);
  assert.equal(f.writes.length, 0);
});

test('public results cannot read a restricted mock', async () => {
  const f = fixture({ accessType: 'restricted' });
  await assert.rejects(f.service.getPublicMockResults('test'), /not publicly available/);
});

test('mock details use the current linked quiz description', async () => {
  const f = fixture({ quizId: 'quiz', description: 'Old description' });
  f.records['quizzes/quiz'] = { type: 'grand-mock', description: 'Updated CMS description' };
  const result = await f.service.getMockDetails('test');
  assert.equal(result.description, 'Updated CMS description');
});

test('restricted rankings check course access before reading results', async () => {
  const f = fixture({ accessType: 'restricted' });
  let reads = 0;
  const route = load('app/api/app/mocks/[id]/results/route.ts', {
    ...f.modules,
    'next/server': { NextResponse: { json: (data, init) => ({ data, ...init }) } },
    '@/lib/server/appSession': { requireAppUser: async () => ({ user: { uid: 'u1' } }) },
    '@/lib/server/appContentAccess': { buildAppContentAccessContext: async () => ({ getMockAccess: () => ({ allowed: false, mode: 'locked' }) }) },
    '@/lib/server/mockService': { getPublicMockResults: async () => { reads++; return {}; } },
  });
  const response = await route.GET({}, { params: Promise.resolve({ id: 'test' }) });
  assert.equal(response.status, 403);
  assert.equal(reads, 0);
});

test('authenticated retakes preserve the first private answers and do not update aggregate statistics', async () => {
  const f = fixture();
  const stats = [];
  const route = load('app/api/app/mocks/[id]/attempts/route.ts', {
    ...f.modules,
    'next/server': { NextResponse: { json: data => data } },
    '@/lib/server/appSession': { requireAppUser: async () => ({ user: { uid: 'u1', email: 'one@example.test', name: 'One', tier: 'paid' } }) },
    '@/lib/server/appContentAccess': { buildAppContentAccessContext: async () => ({}) },
    '@/lib/server/candidateProgress': {
      getMockAttemptsCollection: () => ({ doc: id => ({ key: `private/${id}` }) }),
      toPositiveNumber: value => Number(value) || 0,
      toPercent: (score, total) => score / total * 100,
      averageWithNext: (_, __, score) => score,
      updateUserStats: async (_, updater) => stats.push(updater({ mocksAttempted: 0, grandMocksAttempted: 0, bestMockScore: 0 })),
    },
  });
  const submit = body => route.POST({ json: async () => body }, { params: Promise.resolve({ id: 'test' }) });
  await submit({ marks: 2, totalQuestions: 10, answers: { q1: 1, q2: 2 } });
  const saved = JSON.stringify(f.records['private/test']);
  const retake = await submit({ marks: 9, totalQuestions: 10, answers: { q1: 3 } });
  assert.equal(retake.alreadyRecorded, true);
  assert.equal(retake.attempt.marks, 2);
  assert.equal(JSON.stringify(f.records['private/test']), saved);
  assert.equal(f.records['mocks/test'].attempts[0].answers, undefined);
  assert.equal(stats.length, 1);
});

test('saved answers accept only valid option indices', () => {
  const result = helpers.normalizeMockAnswers({ q1: 0, q2: 4, q3: -1, q4: 8, q5: '2', q6: null });
  assert.equal(JSON.stringify(result), '{"q1":0,"q2":4}');
});
