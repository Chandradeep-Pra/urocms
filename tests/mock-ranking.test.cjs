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
  const profileReads = [];
  const authReads = [];
  const ref = key => ({ key, get: async () => snapshot(key) });
  const snapshot = key => ({ exists: key in records, data: () => records[key] });
  const db = {
    collection: name => ({
      doc: id => ref(`${name}/${id}`),
      where: (field, operator, emails) => {
        assert.equal(name, 'users');
        assert.equal(field, 'email');
        assert.equal(operator, 'in');
        profileReads.push(emails);
        return { select: () => ({ get: async () => ({ docs: Object.entries(records)
          .filter(([key, data]) => key.startsWith('users/') && emails.includes(data.email))
          .map(([key, data]) => ({ id: key.split('/')[1], data: () => data })) }) }) };
      },
    }),
    runTransaction: async run => run({
      get: async reference => snapshot(reference.key),
      update: (reference, value) => { writes.push(reference.key); records[reference.key] = { ...records[reference.key], ...value }; },
      set: (reference, value) => { writes.push(reference.key); records[reference.key] = value; },
    }),
  };
  const authUsers = [];
  const auth = { getUsers: async identifiers => {
    authReads.push(identifiers);
    return { users: authUsers.filter(user => identifiers.some(identifier => identifier.email === user.email)) };
  } };
  const modules = { '@/lib/firebaseAdmin': { getAdminDb: () => db, getAdminAuth: () => auth }, 'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'timestamp' } }, '@/lib/server/mockAttempts': helpers };
  return { records, writes, modules, db, auth, authUsers, profileReads, authReads, service: load('lib/server/mockService.ts', modules) };
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

test('hidden accounts do not enter public or restricted ranks or participant counts', async () => {
  const f = fixture({ attempts: [
    candidate(' UROLOGOICS.ORG@gmail.com ', 20, '2026-01-01'),
    candidate('chandradeepp611@gmail.com', 19, '2026-01-01'),
    candidate('ankitgoel042@gmail.com', 18, '2026-01-01'),
    candidate('one@example.test', 8, '2026-01-02'),
    candidate('two@example.test', 7, '2026-01-01'),
  ], history: [candidate('ankitgoel042@gmail.com', 1, '2025-12-31')] });
  for (const allowRestricted of [false, true]) {
    f.records['mocks/test'].accessType = allowRestricted ? 'restricted' : 'public';
    const result = await f.service.getPublicMockResults('test', allowRestricted);
    assert.equal(result.attemptsCount, 2);
    assert.deepEqual(Array.from(result.results, row => [row.rank, row.email]), [[1, 'one@example.test'], [2, 'two@example.test']]);
  }
  assert.ok(f.profileReads.flat().every(email => email.endsWith('@example.test')));
  assert.ok(f.authReads.flat().every(user => user.email.endsWith('@example.test')));
  assert.equal(f.records['mocks/test'].attempts.length, 5);
  assert.equal(f.writes.length, 0);
});

test('old ranked attempts use current canonical profile photos or Google Auth provider photos', async () => {
  const f = fixture({ attempts: [
    candidate('one@example.test', 9, '2026-01-01', { candidate: { name: 'One', email: 'one@example.test', image: 'https://photos.test/old.jpg' } }),
    candidate('two@example.test', 8, '2026-01-01'),
    candidate('three@example.test', 7, '2026-01-01'),
  ] });
  f.records['users/one'] = { email: 'one@example.test', canonicalUserId: 'one', profileImageUrl: ' https://photos.test/current.jpg ' };
  f.records['users/shadow'] = { email: 'one@example.test', isShadowDuplicate: true, canonicalUserId: 'one', profileImageUrl: 'https://photos.test/shadow.jpg' };
  f.authUsers.push({ email: 'two@example.test', providerData: [{ photoURL: 'https://photos.test/google.jpg' }] });
  const result = await f.service.getPublicMockResults('test');
  assert.deepEqual(Array.from(result.results, row => row.userImage), ['https://photos.test/current.jpg', 'https://photos.test/google.jpg', null]);
  assert.equal(result.results[0].marks, 9);
  assert.equal(result.results[0].submittedAt, '2026-01-01');
  assert.equal(f.writes.length, 0);
});

test('legacy saved photo fields survive whitespace and unavailable profile services', async () => {
  const f = fixture({ attempts: [
    candidate('one@example.test', 9, '2026-01-01', { candidate: { name: 'One', email: 'one@example.test', image: ' ', profileImageUrl: ' https://photos.test/saved.jpg ' } }),
    candidate('two@example.test', 8, '2026-01-01'),
  ] });
  f.db.collection = name => {
    if (name === 'users') throw new Error('Profile unavailable');
    return { doc: id => ({ get: async () => ({ exists: true, data: () => f.records[`${name}/${id}`] }) }) };
  };
  f.auth.getUsers = async () => { throw new Error('Auth unavailable'); };
  const result = await f.service.getPublicMockResults('test');
  assert.equal(result.results.length, 2);
  assert.equal(result.results[0].userImage, 'https://photos.test/saved.jpg');
  assert.equal(result.results[1].userImage, null);
});

test('profile and auth photo requests stay within batch limits', async () => {
  const f = fixture({ attempts: Array.from({ length: 131 }, (_, i) => candidate(`user${i}@example.test`, i, '2026-01-01')) });
  const result = await f.service.getPublicMockResults('test');
  assert.equal(result.results.length, 131);
  assert.equal(f.profileReads.length, 5);
  assert.ok(f.profileReads.every(batch => batch.length <= 30));
  assert.equal(f.authReads.length, 2);
  assert.ok(f.authReads.every(batch => batch.length <= 100));
});

test('a leaderboard containing only hidden accounts performs no photo lookups', async () => {
  const f = fixture({ attempts: [candidate('ankitgoel042@gmail.com', 20, '2026-01-01')] });
  const result = await f.service.getPublicMockResults('test');
  assert.equal(result.results.length, 0);
  assert.equal(result.attemptsCount, 0);
  assert.equal(f.profileReads.length, 0);
  assert.equal(f.authReads.length, 0);
});

test('authenticated sessions use the verified Google picture when the profile has none', async () => {
  for (const profileImageUrl of [null, 'https://photos.test/profile.jpg']) {
    const user = { email: 'one@example.test', canonicalUserId: 'one', profileImageUrl };
    const session = load('lib/server/appSession.ts', {
      'next/server': { NextResponse: { json: data => data } },
      '@/lib/firebaseAdmin': {
        getAdminAuth: () => ({ verifyIdToken: async () => ({ uid: 'one', email: user.email, picture: 'https://photos.test/google.jpg', firebase: { sign_in_provider: 'google.com' } }) }),
        getAdminDb: () => ({ collection: () => ({ doc: () => ({ get: async () => ({ exists: true, data: () => user }) }) }) }),
      },
      '@/lib/server/userIdentity': { normalizeEmail: email => email?.trim().toLowerCase(), resolveCanonicalUserRecord: () => { throw new Error('Unexpected identity reconciliation'); } },
    });
    const result = await session.requireAppUser({ headers: { get: () => 'Bearer test' } });
    assert.equal(result.user.profileImageUrl, profileImageUrl || 'https://photos.test/google.jpg');
  }
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
