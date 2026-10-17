const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, { exports, Date, Buffer, console, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected import: ${name}`);
    return modules[name];
  } });
  return exports;
}

const user = { uid: 'candidate', name: 'Verified Candidate', email: 'candidate@example.test' };
const mockInput = extra => ({ kind: 'mock', contextId: 'mock1', submissionId: 'submission-12345', questionsRating: 2, appRating: 4, reason: 'More clinical context please.', candidate: { name: 'Guest', email: user.email }, ...extra });
function fixture() {
  const records = {
    'mocks/mock1': { title: 'Mock One', accessType: 'public', attempts: [{ candidate: { uid: user.uid, email: user.email } }] },
    'vivaCases/viva1': { case: { title: 'Viva One' }, accessType: 'public', publicParticipants: [{ email: user.email }] },
  };
  const writes = [];
  const snapshot = key => ({ exists: key in records, id: key.split('/')[1], data: () => records[key] });
  const ref = key => ({ key, get: async () => snapshot(key), collection: name => ({ doc: id => ref(`${key}/${name}/${id}`) }) });
  let pending = Promise.resolve();
  let accessAllowed = true;
  const db = { collection(name) {
    const list = () => Object.entries(records).filter(([key]) => key.startsWith(`${name}/`) && key.split('/').length === 2);
    let cursor, size;
    const query = {
      orderBy: () => query,
      startAfter: (time, id) => { cursor = { time, id }; return query; },
      limit: value => { size = value; return query; },
      get: async () => ({ docs: list().map(([key, data]) => ({ id: key.split('/')[1], data: () => data }))
        .sort((a, b) => b.data().submittedAt.localeCompare(a.data().submittedAt) || b.id.localeCompare(a.id))
        .filter(doc => !cursor || doc.data().submittedAt < cursor.time || doc.data().submittedAt === cursor.time && doc.id < cursor.id).slice(0, size) }),
    };
    return { doc: id => ref(`${name}/${id}`), orderBy: query.orderBy, count: () => ({ get: async () => ({ data: () => ({ count: list().length }) }) }) };
  }, runTransaction(run) {
    const task = pending.then(() => run({ get: async ref => snapshot(ref.key), create(ref, value) {
      assert.equal(ref.key in records, false);
      records[ref.key] = value; writes.push(ref.key);
    } }));
    pending = task.catch(() => {});
    return task;
  } };
  const modules = {
    'node:crypto': require('node:crypto'),
    'firebase-admin/firestore': { FieldPath: { documentId: () => '__name__' } },
    '@/lib/firebaseAdmin': { getAdminDb: () => db },
    '@/lib/server/appContentAccess': { buildAppContentAccessContext: async () => ({ getMockAccess: () => ({ allowed: accessAllowed, mode: accessAllowed ? 'full' : 'locked' }), getVivaAccess: () => ({ allowed: accessAllowed, mode: accessAllowed ? 'full' : 'locked' }) }) },
  };
  const service = load('lib/server/experienceFeedbackService.ts', modules);
  return { records, writes, service, denyAccess: () => { accessAllowed = false; } };
}

test('web mock stores both ratings and optional low-star reason in one mock_feedbacks document', async () => {
  const f = fixture();
  const result = await f.service.submitExperienceFeedback(mockInput(), { platform: 'web', user });
  assert.equal(f.writes.length, 1);
  const row = f.records[`mock_feedbacks/${result.id}`];
  assert.equal(row.ratings.questions, 2);
  assert.equal(row.ratings.appExperience, 4);
  assert.equal(row.reason, 'More clinical context please.');
  assert.equal(row.contextTitle, 'Mock One');
  assert.equal(row.candidate.name, user.name);
  assert.ok(row.submittedAt.endsWith('Z'));
  assert.equal(Object.keys(f.records).some(key => key.startsWith('webapp_feedbacks/')), false);
});

test('reason is optional under three stars and discarded when the rating improves', async () => {
  for (const questionsRating of [1, 2, 3, 5]) {
    const f = fixture();
    const result = await f.service.submitExperienceFeedback(mockInput({ questionsRating, reason: questionsRating === 3 ? 'Stale hidden reason' : undefined }), { platform: 'web', user });
    assert.equal(f.records[`mock_feedbacks/${result.id}`].reason, null);
  }
});

test('viva and general webapp reviews use their own collections; every mobile kind uses app_feedbacks', async () => {
  const inputs = [
    { kind: 'viva', contextId: 'viva1', submissionId: 'viva-session-123', vivaRating: 5, comment: 'Helpful examiner.' },
    { kind: 'webapp', submissionId: 'web-session-123', appRating: 4 },
    mockInput(),
  ];
  for (const platform of ['web', 'mobile']) for (const input of inputs) {
    const f = fixture();
    const result = await f.service.submitExperienceFeedback(input, { platform, user });
    const collection = platform === 'mobile' ? 'app_feedbacks' : `${input.kind}_feedbacks`;
    assert.ok(f.records[`${collection}/${result.id}`]);
    assert.equal(f.records[`${collection}/${result.id}`].kind, input.kind);
  }
});

test('concurrent retries create only one feedback record and preserve the original response', async () => {
  const f = fixture();
  const results = await Promise.all(Array.from({ length: 4 }, () => f.service.submitExperienceFeedback(mockInput(), { platform: 'web', user })));
  assert.equal(f.writes.length, 1);
  assert.equal(results.filter(result => result.alreadyRecorded).length, 3);
  const repeated = await f.service.submitExperienceFeedback(mockInput({ questionsRating: 5 }), { platform: 'web', user });
  assert.equal(repeated.alreadyRecorded, true);
  assert.equal(f.records[f.writes[0]].ratings.questions, 2);
});

test('general mobile app reviews have their own kind and cannot be submitted as public web feedback', async () => {
  const f = fixture();
  const input = { kind: 'app', submissionId: 'mobile-app-review-123', appRating: 5, comment: 'Useful on my phone.' };
  const result = await f.service.submitExperienceFeedback(input, { platform: 'mobile', user });
  assert.equal(f.records[`app_feedbacks/${result.id}`].kind, 'app');
  await assert.rejects(f.service.submitExperienceFeedback(input, { platform: 'web', user: null }), error => error.status === 400);
});

test('ratings, IDs and text are validated before creating any document', async () => {
  const invalid = [null, {}, mockInput({ questionsRating: 0 }), mockInput({ questionsRating: 6 }), mockInput({ questionsRating: 2.5 }), mockInput({ appRating: '4' }), mockInput({ contextId: '../users' }), mockInput({ submissionId: 'bad' }), mockInput({ reason: 'a'.repeat(2001) })];
  for (const input of invalid) {
    const f = fixture();
    await assert.rejects(f.service.submitExperienceFeedback(input, { platform: 'web', user }), error => error.status === 400);
    assert.equal(f.writes.length, 0);
  }
});

test('public participants can review completed public mocks and started public vivas', async () => {
  const f = fixture();
  await f.service.submitExperienceFeedback(mockInput(), { platform: 'web', user: null });
  await f.service.submitExperienceFeedback({ kind: 'viva', contextId: 'viva1', submissionId: 'viva-guest-123', vivaRating: 4, candidate: { email: user.email } }, { platform: 'web', user: null });
  assert.equal(f.writes.length, 2);
  assert.equal(f.records[f.writes[0]].candidate.uid, null);
});

test('public feedback cannot target restricted assessments or unsubmitted mocks', async () => {
  const f = fixture();
  f.records['mocks/mock1'].accessType = 'restricted';
  await assert.rejects(f.service.submitExperienceFeedback(mockInput(), { platform: 'web', user: null }), error => error.status === 403);
  f.records['mocks/mock1'].accessType = 'public';
  f.records['mocks/mock1'].attempts = [];
  await assert.rejects(f.service.submitExperienceFeedback(mockInput(), { platform: 'web', user: null }), error => error.status === 403);
  await assert.rejects(f.service.submitExperienceFeedback({ kind: 'viva', contextId: 'viva1', submissionId: 'viva-guest-123', vivaRating: 4, candidate: { email: 'unknown@example.test' } }, { platform: 'web', user: null }), error => error.status === 403);
  assert.equal(f.writes.length, 0);
});

test('restricted feedback checks the signed-in account access', async () => {
  const f = fixture();
  f.records['mocks/mock1'].accessType = 'restricted';
  f.denyAccess();
  await assert.rejects(f.service.submitExperienceFeedback(mockInput(), { platform: 'web', user }), error => error.status === 403);
  assert.equal(f.writes.length, 0);
});

test('backend supplies category badges and counts, and pagination keeps tied records across collections', async () => {
  const f = fixture();
  const collections = ['mock_feedbacks', 'viva_feedbacks', 'webapp_feedbacks', 'app_feedbacks'];
  for (let i = 0; i < 17; i++) f.records[`${collections[i % 4]}/${i.toString(16).padStart(64, '0')}`] = {
    submittedAt: i < 9 ? '2026-10-17T10:00:00.000Z' : '2026-10-17T09:00:00.000Z', ratings: { appExperience: 4 }, candidate: {}, platform: 'web', kind: 'webapp',
  };
  const found = [];
  let cursor = null, pages = 0;
  do {
    const page = await f.service.listExperienceFeedback({ limit: '3', cursor });
    assert.equal(page.filters.length, 5);
    assert.equal(page.filters[0].count, 17);
    assert.deepEqual(Array.from(page.filters.slice(1), item => item.label), ['Webapp Feedbacks', 'Mock Feedbacks', 'Viva Feedbacks', 'App Feedbacks']);
    found.push(...page.items.map(item => `${item.category}/${item.id}`));
    cursor = page.nextCursor;
    if (++pages > 10) throw new Error('Pagination did not finish');
  } while (cursor);
  assert.equal(found.length, 17);
  assert.equal(new Set(found).size, 17);
  const filtered = await f.service.listExperienceFeedback({ category: 'viva', limit: '100' });
  assert.ok(filtered.items.every(item => item.category === 'viva'));
  assert.equal(filtered.items.length, 4);
  await assert.rejects(f.service.listExperienceFeedback({ category: 'users' }), error => error.status === 400);
  await assert.rejects(f.service.listExperienceFeedback({ cursor: 'garbage' }), error => error.status === 400);
});

test('admin inbox rejects non-admin readers before querying feedback', async () => {
  const route = load('app/api/experience-feedback/route.ts', {
    'next/server': { NextResponse: { json: (data, init) => ({ data, ...init }) } },
    '@/lib/server/adminAccess': { requireAdminSession: async () => ({ response: { status: 403 } }) },
    '@/lib/server/experienceFeedbackService': { listExperienceFeedback: () => { throw new Error('Unexpected read'); } },
  });
  assert.equal((await route.GET({})).status, 403);
});

test('mobile endpoint defaults to mobile, and authenticated web requests preserve verified identity', async () => {
  const f = fixture();
  const route = load('app/api/app/experience-feedback/route.ts', {
    'next/server': { NextResponse: { json: (data, init) => ({ data, ...init }) } },
    '@/lib/server/appSession': { requireAppUser: async () => ({ user }) },
    '@/lib/server/experienceFeedbackService': f.service,
  });
  for (const platform of [undefined, 'web']) {
    const response = await route.POST({ json: async () => mockInput({ platform }) });
    assert.equal(response.data.success, true);
  }
  assert.ok(f.writes.some(key => key.startsWith('app_feedbacks/')));
  assert.ok(f.writes.some(key => key.startsWith('mock_feedbacks/')));
  const invalid = await route.POST({ json: async () => null });
  assert.equal(invalid.status, 400);
});
