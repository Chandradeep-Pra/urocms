const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules = {}, globals = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, Date, URL, console, require: name => modules[name] || {}, ...globals });
  return exports;
}

function sessionFixture(records, decoded = { uid: 'login', email: 'one@example.test', firebase: { sign_in_provider: 'password' } }) {
  const reads = [];
  const writes = [];
  const snapshot = id => ({ id, exists: Boolean(records[id]), data: () => records[id] });
  const collection = {
    doc: id => ({ get: async () => { reads.push(id); return snapshot(id); }, set: async () => { writes.push(id); throw new Error('Unexpected write'); } }),
    where: (_, __, email) => ({ get: async () => { reads.push('email-query'); return { docs: Object.keys(records).filter(id => records[id].email === email).map(snapshot) }; } }),
  };
  const firebase = { getAdminDb: () => ({ collection: () => collection }), getAdminAuth: () => ({ verifyIdToken: async () => decoded }) };
  const identity = load('lib/server/userIdentity.ts', { '@/lib/firebaseAdmin': firebase });
  const session = load('lib/server/appSession.ts', { '@/lib/firebaseAdmin': firebase, '@/lib/server/userIdentity': identity, 'next/server': { NextResponse: { json: (data, init) => ({ data, ...init }) } } });
  return { reads, writes, resolve: () => session.requireAppUser({ headers: new Headers({ authorization: 'Bearer test' }) }) };
}

test('mapped identity reuses its first snapshot with no lookup or write', async () => {
  const fixture = sessionFixture({ login: { email: 'one@example.test', canonicalUserId: 'login', tier: 'paid' } });
  const result = await fixture.resolve();
  assert.equal(result.user.tier, 'paid');
  assert.deepEqual(fixture.reads, ['login']);
  assert.deepEqual(fixture.writes, []);
});

test('legacy duplicates retain combined entitlements without migrating records', async () => {
  const records = {
    login: { email: 'one@example.test', tier: 'free', activeCourseIds: ['new-course'] },
    legacy: { email: 'one@example.test', tier: 'paid', activeCourseIds: ['old-course'], createdAt: '2020-01-01' },
  };
  const before = JSON.stringify(records);
  const fixture = sessionFixture(records);
  const result = await fixture.resolve();
  assert.equal(result.user.uid, 'legacy');
  assert.equal(result.user.tier, 'paid');
  assert.deepEqual(Array.from(result.user.activeCourseIds).sort(), ['new-course', 'old-course']);
  assert.deepEqual(fixture.writes, []);
  assert.equal(JSON.stringify(records), before);
  assert.deepEqual(fixture.reads, ['login', 'email-query']);
});

test('a first authenticated read does not create a user record', async () => {
  const fixture = sessionFixture({});
  const result = await fixture.resolve();
  assert.equal(result.user.uid, 'login');
  assert.equal(result.user.tier, 'guest');
  assert.deepEqual(fixture.writes, []);
  assert.deepEqual(fixture.reads, ['login', 'email-query']);
});

test('anonymous reads remain transient', async () => {
  const fixture = sessionFixture({}, { uid: 'login', firebase: { sign_in_provider: 'anonymous' } });
  assert.equal((await fixture.resolve()).user.tier, 'guest');
  assert.deepEqual(fixture.reads, ['login']);
  assert.deepEqual(fixture.writes, []);
});

test('canonical pointers with another email cannot inherit that account access', async () => {
  const fixture = sessionFixture({
    login: { email: 'one@example.test', canonicalUserId: 'other', tier: 'free' },
    other: { email: 'other@example.test', tier: 'paid' },
  });
  const result = await fixture.resolve();
  assert.equal(result.user.uid, 'login');
  assert.equal(result.user.tier, 'free');
  assert.deepEqual(fixture.writes, []);
});

test('Storage range parsing handles suffixes, clipping, open ranges and invalid input', () => {
  const { parseByteRange } = load('lib/server/byteRange.ts');
  for (const [header, expected] of [
    [null, null], ['bytes=0-9', { start: 0, end: 9 }], ['bytes=90-', { start: 90, end: 99 }],
    ['bytes=-10', { start: 90, end: 99 }], ['bytes=-200', { start: 0, end: 99 }],
    ['bytes=90-200', { start: 90, end: 99 }], ['bytes=100-', false], ['bytes=9-1', false],
    ['bytes=-0', false], ['bytes=-', false], ['bytes=0-1,4-5', false], ['invalid', false],
  ]) assert.deepEqual(JSON.parse(JSON.stringify(parseByteRange(header, 100))), expected, String(header));
  assert.equal(parseByteRange('bytes=0-', 0), false);
});

for (const allowed of [true, false]) {
  test(`Drive playback ${allowed ? 'succeeds without changing sharing' : 'rejects locked access'}`, async () => {
    let grants = 0;
    const service = load('lib/server/firestoreVideoService.ts', {
      '@/lib/firebaseAdmin': { getAdminDb: () => ({ collection: () => ({
        doc: () => ({ get: async () => ({ id: 'video', exists: true, data: () => ({ provider: 'drive', driveFileId: 'file', accessTier: 'paid' }) }) }),
        add: async () => {},
      }) }) },
      '@/lib/server/appContentAccess': { buildAppContentAccessContext: async () => ({ getVideoAccess: () => ({ mode: allowed ? 'full' : 'locked' }) }) },
      '@/lib/server/googleDrive': { grantDriveAccessToEmail: async () => { grants++; } },
    });
    const pending = service.playVideoFromFirestore({ videoId: 'video', mode: 'app', user: { uid: 'user', email: 'one@example.test', tier: 'paid' } });
    if (allowed) assert.equal((await pending).playback.provider, 'drive');
    else await assert.rejects(pending, error => error.status === 403);
    assert.equal(grants, 0);
  });
}

function playbackFixture(renew) {
  const document = new EventTarget();
  document.visibilityState = 'visible';
  const video = new EventTarget();
  Object.assign(video, { currentTime: 125, duration: 3600, paused: false, playbackRate: 1.5, src: 'old', load() {}, play: async () => { video.played = true; } });
  const timers = new Map();
  let timerId = 0;
  const errors = [];
  const { attachSignedPlayback } = load('lib/client/signedPlayback.ts', {}, {
    document, setTimeout: callback => { timers.set(++timerId, callback); return timerId; }, clearTimeout: id => timers.delete(id),
  });
  const detach = attachSignedPlayback(video, { url: 'old', expiresAt: Date.now() + 500_000 }, renew, message => errors.push(message));
  return { document, video, timers, errors, detach };
}

const settle = () => new Promise(resolve => setImmediate(resolve));

test('catalog allowlist excludes delivery URLs, storage paths and private document fields', () => {
  const { videoCatalogDto } = load('lib/server/videoCatalogDto.ts');
  const result = videoCatalogDto('one', {
    title: 'Lesson', provider: 'drive', storagePath: 'private/video.mp4', storageBucket: 'private',
    driveFileId: 'secret', videoUrl: 'https://private.test/video', internalNotes: 'private', memberUserIds: ['one'],
  });
  assert.equal(result.title, 'Lesson');
  assert.equal(result.isSyncedToCloudStorage, true);
  for (const field of ['storagePath', 'storageBucket', 'driveFileId', 'videoUrl', 'internalNotes', 'memberUserIds']) assert.equal(field in result, false);
});

test('YouTube catalog thumbnails remain available without returning the video URL', () => {
  const { videoCatalogDto } = load('lib/server/videoCatalogDto.ts');
  const result = videoCatalogDto('one', { provider: 'youtube', videoUrl: 'https://www.youtube.com/watch?v=abcdefghijk' });
  assert.equal(result.thumbnailUrl, 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg');
});

test('renewal preserves the latest position, speed and playing state', async () => {
  const fixture = playbackFixture(async () => ({ url: 'new', expiresAt: Date.now() + 900_000 }));
  fixture.timers.values().next().value();
  fixture.video.currentTime = 130;
  await settle();
  assert.equal(fixture.video.src, 'new');
  fixture.video.currentTime = 0;
  fixture.video.playbackRate = 1;
  fixture.video.dispatchEvent(new Event('loadedmetadata'));
  assert.equal(fixture.video.currentTime, 130);
  assert.equal(fixture.video.playbackRate, 1.5);
  assert.equal(fixture.video.played, true);
  fixture.detach();
  assert.equal(fixture.timers.size, 0);
});

test('repeated media errors renew only once and then surface an error', async () => {
  let calls = 0;
  const fixture = playbackFixture(async () => { calls++; return { url: 'new' }; });
  fixture.video.dispatchEvent(new Event('error'));
  await settle();
  fixture.video.dispatchEvent(new Event('error'));
  await settle();
  assert.equal(calls, 1);
  assert.match(fixture.errors[0], /Unable to play/);
  fixture.detach();
});

test('failed authorization stops automatic renewal', async () => {
  let calls = 0;
  const fixture = playbackFixture(async () => { calls++; throw new Error('403'); });
  fixture.timers.values().next().value();
  await settle();
  assert.equal(calls, 1);
  assert.equal(fixture.timers.size, 0);
  assert.equal(fixture.video.src, 'old');
  assert.match(fixture.errors[0], /could not be renewed/);
  fixture.detach();
});

test('changing lessons ignores an outstanding renewal response', async () => {
  let complete;
  const fixture = playbackFixture(() => new Promise(resolve => { complete = resolve; }));
  fixture.timers.values().next().value();
  fixture.detach();
  complete({ url: 'stale' });
  await settle();
  assert.equal(fixture.video.src, 'old');
  assert.equal(fixture.timers.size, 0);
});
