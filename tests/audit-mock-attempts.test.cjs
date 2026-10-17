const test = require('node:test');
const assert = require('node:assert/strict');
const { audit } = require('../scripts/audit-mock-attempts.cjs');

const firstTime = '2026-10-16T10:34:08.546Z';
const laterTime = '2026-10-16T11:34:08.546Z';
const entry = (name, marks, createdAt) => ({
  candidate: { name, email: `${name.toLowerCase()}@example.test` },
  marks, createdAt, attemptNumber: 1,
});

// This fixture deliberately exposes reads only. Any write or unexpected read fails.
function fixture(data, privateData, foundUser = true) {
  const privateDoc = { id: 'test', exists: Boolean(privateData),
    ref: { path: 'mockAttempts/user/items/test' }, data: () => privateData };
  const db = { collection(name) {
    if (name === 'users') return { where: () => ({ select: () => ({ get: async () => ({ docs: [] }) }) }) };
    if (name === 'mocks') return { doc(id) {
      assert.equal(id, 'test');
      return { get: async () => ({ exists: true, id, data: () => data }) };
    } };
    assert.equal(name, 'mockAttempts');
    return { doc(uid) {
      assert.equal(uid, 'user');
      return { collection(subcollection) {
        assert.equal(subcollection, 'items');
        return {
          where(field, op, value) {
            assert.deepEqual([field, op, value], ['mockId', '==', 'test']);
            return { get: async () => ({ docs: privateData ? [privateDoc] : [] }) };
          },
          doc(id) { assert.equal(id, 'test'); return { get: async () => privateDoc }; },
        };
      } };
    } };
  } };
  const auth = { getUsers: async () => ({ users: [] }), getUserByEmail: async email => {
    assert.equal(email, 'arti@example.test');
    if (!foundUser) throw Object.assign(new Error('not found'), { code: 'auth/user-not-found' });
    return { uid: 'user' };
  } };
  return { db, auth };
}

test('audit matches the ranked first submission to private duration without duplicating the private document', async () => {
  const { db, auth } = fixture({ title: 'Test', attempts: [entry('Arti', 18, firstTime)] }, {
    mockId: 'test', score: 18, submittedAt: firstTime, timeTakenSeconds: 9,
  });
  const report = await audit(db, auth, 'test');
  assert.equal(report.rank1.name, 'Arti');
  assert.equal(report.rankedMatchesEarliestKnownTimestamp, true);
  assert.equal(report.records.length, 2);
  assert.equal(report.records.filter(row => row.timeTakenSeconds === 9).length, 1);
  assert.ok(report.records.every(row => row.matchesRankedSubmission));
  assert.equal(report.warnings.length, 0);
});

test('audit uses archived first scores and flags older private evidence', async () => {
  const { db, auth } = fixture({
    title: 'Test', history: [entry('Arti', 2, firstTime)],
    attempts: [entry('Arti', 18, laterTime), entry('Other', 13, firstTime)],
  }, { mockId: 'test', score: 1, submittedAt: '2026-10-16T09:00:00.000Z' });
  const report = await audit(db, auth, 'test', 'Arti');
  assert.equal(report.rank1.name, 'Other');
  assert.equal(report.candidate.rank, 2);
  assert.equal(report.candidate.marks, 2);
  assert.equal(report.records.length, 3);
  assert.equal(report.rankedMatchesEarliestKnownTimestamp, false);
  assert.ok(report.warnings.some(warning => warning.includes('earlier saved record')));
});

test('public-only submissions keep missing duration unknown', async () => {
  const { db, auth } = fixture({ title: 'Test', attempts: [entry('Arti', 18, firstTime)] }, null, false);
  const report = await audit(db, auth, 'test');
  assert.equal(report.records.length, 1);
  assert.equal(report.records[0].timeTakenSeconds, null);
  assert.ok(report.warnings.some(warning => warning.includes('No Firebase Auth user')));
});
