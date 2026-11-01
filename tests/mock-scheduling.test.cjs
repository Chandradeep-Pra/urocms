const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { exports, Date, Error, console: { ...console, error() {} }, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
    return modules[name];
  } });
  return exports;
}

function fixture(type = 'grand-mock') {
  const records = { 'quizzes/source': { title: 'Source quiz', type, durationMinutes: 60 } };
  let sequence = 0;
  const db = { collection: name => ({
    doc: id => ({
      get: async () => ({ id, exists: `${name}/${id}` in records, data: () => records[`${name}/${id}`] }),
      update: async data => { records[`${name}/${id}`] = { ...records[`${name}/${id}`], ...data }; },
    }),
    add: async data => {
      const id = `event-${++sequence}`;
      records[`${name}/${id}`] = data;
      return { id };
    },
  }) };
  const service = load('lib/server/mockService.ts', {
    '@/lib/firebaseAdmin': { getAdminDb: () => db },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'timestamp' } },
    '@/lib/server/mockAttempts': {},
    '@/lib/server/mockAttemptTracking': {},
    '@/lib/server/adminMockAttempts': {},
  });
  const routeModules = {
    'next/server': { NextResponse: { json: (body, init) => ({ body, ...init }) } },
    '@/lib/server/adminAccess': { requireAdminSession: async () => ({}) },
    '@/lib/server/mockService': service,
    '@/lib/server/adminMockAttempts': {},
  };
  const notifications = [];
  const createRoute = load('app/api/mocks/route.ts', {
    ...routeModules,
    '@/lib/server/notificationService': { publishNotification: async value => notifications.push(value) },
  });
  const editRoute = load('app/api/mocks/[id]/route.ts', routeModules);
  const create = input => service.createMockSchedule({ quizId: 'source', startTime: '2026-11-10T10:00:00Z', ...input });
  return { records, service, create, createRoute, editRoute, notifications };
}

test('custom mock and grand mock names are saved independently of the quiz name and type', async () => {
  for (const type of ['mock', 'grand-mock']) {
    const f = fixture(type);
    const result = await f.create({ title: '  November revision  ' });
    assert.equal(result.title, 'November revision');
    assert.equal(f.records[`mocks/${result.id}`].title, result.title);
    assert.equal(f.records[`mocks/${result.id}`].quizId, 'source');
    assert.equal(f.records[`mocks/${result.id}`].type, type);
    assert.equal(f.records['quizzes/source'].title, 'Source quiz');
  }
});

test('legacy create requests still default to the quiz title', async () => {
  const f = fixture();
  const result = await f.create({});
  assert.equal(result.title, 'Source quiz');
});

test('two schedules using one quiz have distinct IDs and start with no participants or scores', async () => {
  const f = fixture();
  const original = await f.create({ title: 'Original event' });
  const saved = f.records[`mocks/${original.id}`];
  saved.attempts.push({ candidate: { name: 'Student', email: 'student@example.test' }, marks: 42 });
  saved.attemptsCount = 1;
  const fresh = await f.create({ title: 'New event' });
  assert.notEqual(fresh.id, original.id);
  assert.equal(f.records[`mocks/${fresh.id}`].attempts.length, 0);
  assert.equal(f.records[`mocks/${fresh.id}`].attemptsCount, 0);
  assert.equal(saved.attempts[0].marks, 42);
});

test('schedule edits preserve custom names and explicit renames leave the linked quiz alone', async () => {
  const f = fixture();
  const result = await f.create({ title: 'Revision event' });
  f.records['quizzes/source'].title = 'Renamed source quiz';
  await f.service.updateMockSchedule(result.id, { durationMinutes: 90 });
  assert.equal(f.records[`mocks/${result.id}`].title, 'Revision event');
  await f.service.updateMockSchedule(result.id, { title: '  Final revision  ' });
  assert.equal(f.records[`mocks/${result.id}`].title, 'Final revision');
  assert.equal(f.records['quizzes/source'].title, 'Renamed source quiz');
});

test('older schedules retain their saved title and missing titles fall back to the quiz', async () => {
  const f = fixture();
  f.records['mocks/legacy'] = { quizId: 'source', title: 'Saved event', startTime: '2026-11-10T10:00:00Z' };
  await f.service.updateMockSchedule('legacy', { durationMinutes: 75 });
  assert.equal(f.records['mocks/legacy'].title, 'Saved event');
  delete f.records['mocks/legacy'].title;
  await f.service.updateMockSchedule('legacy', {});
  assert.equal(f.records['mocks/legacy'].title, 'Source quiz');
});

test('a custom name does not allow chapter quizzes into mock scheduling', async () => {
  const f = fixture('chapter');
  await assert.rejects(f.create({ title: 'Grand mock' }), /Only mock type quizzes can be linked/);
  assert.equal(Object.keys(f.records).length, 1);
});

test('grand mock announcements use the scheduled name', async () => {
  const f = fixture();
  const response = await f.createRoute.POST({ json: async () => ({ quizId: 'source', title: 'November Grand Mock', startTime: '2026-11-10T10:00:00Z' }) });
  assert.equal(response.body.success, true);
  assert.equal(f.notifications[0].body, 'November Grand Mock');
  assert.equal(f.notifications[0].sourceId, response.body.id);
});

test('blank and invalid explicit names return HTTP 400 on create and edit without saving', async () => {
  const f = fixture();
  const original = await f.create({ title: 'Keep me' });
  for (const title of ['', '   ', null, 42, {}]) {
    const response = await f.createRoute.POST({ json: async () => ({ quizId: 'source', title, startTime: '2026-11-10T10:00:00Z' }) });
    assert.equal(response.status, 400);
    const edit = await f.editRoute.PATCH({ json: async () => ({ title }) }, { params: Promise.resolve({ id: original.id }) });
    assert.equal(edit.status, 400);
    assert.equal(f.records[`mocks/${original.id}`].title, 'Keep me');
  }
  assert.equal(Object.keys(f.records).length, 2);
});

// Exercise the page's form handlers with local API fixtures, without admin credentials.
async function formFixture(editing = false) {
  const file = editing ? 'app/dashboard/assesments/grand-mocks/[id]/page.tsx' : 'app/dashboard/assesments/grand-mocks/page.tsx';
  const quizzes = [
    { id: 'one', title: 'Quiz One', type: 'mock', durationMinutes: 60 },
    { id: 'two', title: 'Quiz Two', type: 'grand-mock', durationMinutes: 90 },
  ];
  const mock = { id: 'event', title: 'Existing custom name', quizId: 'one', quiz: quizzes[0], startTime: '2026-11-10T10:00:00Z', durationMinutes: 60, attempts: [], attemptRows: [], questions: [] };
  const states = [], writes = [], errors = [], effects = [];
  let cursor = 0, mounted = false, tree;
  const source = fs.readFileSync(file, 'utf8');
  const modules = Object.fromEntries([...source.matchAll(/from "([^"]+)"/g)].map(([, name]) => [name, new Proxy({}, { get: (_, key) => key })]));
  modules.react = {
    useState(initial) {
      const index = cursor++;
      if (!(index in states)) states[index] = typeof initial === 'function' ? initial() : initial;
      return [states[index], value => { states[index] = typeof value === 'function' ? value(states[index]) : value; }];
    },
    useEffect(effect) { if (!mounted) effects.push(effect); },
    useCallback: callback => callback,
  };
  modules['react/jsx-runtime'] = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
  modules['next/navigation'] = { useParams: () => ({ id: 'event' }), useRouter: () => ({}) };
  modules.sonner = { toast: { success() {}, error: message => errors.push(message) } };
  modules['@/lib/client/adminApi'] = { adminFetch: async (url, init) => {
    if (init?.body) writes.push({ url, method: init.method, body: JSON.parse(init.body) });
    const data = url === '/api/quizzes' ? { quizzes } : url === '/api/mocks' ? { mocks: [] } : { mock };
    return { ok: true, json: async () => data };
  } };
  const Page = load(file, modules).default;
  const render = () => { cursor = 0; tree = Page(); mounted = true; };
  const nodes = node => Array.isArray(node) ? node.flatMap(nodes)
    : node && typeof node === 'object' ? [node, ...nodes(node.props?.children)] : [];
  const find = predicate => {
    render();
    const node = nodes(tree).find(predicate);
    assert.ok(node, 'Expected form control');
    return node.props;
  };
  render();
  effects.forEach(effect => effect());
  await new Promise(resolve => setImmediate(resolve));
  return {
    writes, errors,
    name: () => find(node => node.props?.id === 'mock-name').value,
    rename: value => find(node => node.props?.id === 'mock-name').onChange({ target: { value } }),
    choose: value => find(node => node.type === 'Select').onValueChange(value),
    start: value => find(node => node.type === 'Input' && node.props?.type === 'datetime-local').onChange({ target: { value } }),
    save: () => find(node => node.type === 'Button' && node.props?.children === (editing ? 'Save Changes' : 'Save Mock')).onClick(),
  };
}

test('scheduling form suggests quiz names, preserves custom names when switching quizzes, and submits the chosen name', async () => {
  const f = await formFixture();
  f.choose('one');
  assert.equal(f.name(), 'Quiz One');
  f.choose('two');
  assert.equal(f.name(), 'Quiz Two');
  f.rename('  My revision mock  ');
  f.choose('one');
  assert.equal(f.name(), '  My revision mock  ');
  f.start('2026-11-10T10:00');
  await f.save();
  assert.equal(f.writes[0].body.title, 'My revision mock');
  assert.equal(f.writes[0].body.quizId, 'one');
  assert.equal(f.name(), '');
});

test('edit form loads the saved name, preserves it on relinking, and blocks blank names', async () => {
  const f = await formFixture(true);
  assert.equal(f.name(), 'Existing custom name');
  f.choose('two');
  assert.equal(f.name(), 'Existing custom name');
  f.rename('   ');
  await f.save();
  assert.equal(f.writes.length, 0);
  assert.equal(f.errors[0], 'Mock name is required');
  f.rename('Updated event');
  await f.save();
  assert.equal(f.writes[0].method, 'PATCH');
  assert.equal(f.writes[0].body.title, 'Updated event');
  assert.equal(f.writes[0].body.quizId, 'two');
});
