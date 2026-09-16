const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { exports, require(name) {
    if (name === 'server-only') return {};
    if (name in modules) return modules[name];
    throw new Error(`Unexpected import: ${name}`);
  } });
  return exports;
}
const plain = value => JSON.parse(JSON.stringify(value));
const apple = load('lib/apple-plans.ts');
const enabled = { enabled: true, price: 79, currency: 'GBP', productId: 'com.example.plan.3months' };
const plan = { name: 'FRCS', isActive: true, price: 49, discountedPrice: 29, embeddedLink: 'private-web-checkout',
  couponCode: 'WEBONLY', selectedContent: { videoIds: ['private-video'] },
  versions: [{ id: 'three', months: 3, price: 49, billingLabel: 'web billing', apple: enabled }] };

function service(db) {
  return load('lib/server/applePlanService.ts', {
    '@/lib/apple-plans': apple, '@/lib/firebaseAdmin': { getAdminDb: () => db },
  });
}

test('legacy Apple configuration stays unpublished and never inherits a web price', () => {
  assert.deepEqual(plain(apple.parseApplePlanPricing(undefined)), { enabled: false, price: null, currency: 'GBP', productId: '' });
  assert.equal(service().toApplePlan('plan', { ...plan, versions: [{ id: 'old', months: 3, price: 49 }] }), null);
});

test('Apple configuration validates required fields, malformed prices and product IDs', () => {
  for (const data of [{ ...enabled, price: null }, { ...enabled, price: -1 }, { ...enabled, price: NaN },
    { ...enabled, price: Infinity }, { ...enabled, productId: '' }, { ...enabled, productId: 'not a product' }]) {
    assert.ok(apple.validateApplePlanPricing(data));
  }
  assert.equal(apple.validateApplePlanPricing({ ...enabled, price: 0 }), null);
  assert.equal(apple.validateApplePlanPricing(apple.parseApplePlanPricing(undefined)), null);
});

test('Apple public projection uses only iOS price and excludes all web/private fields', () => {
  const result = service().toApplePlan('plan', plan);
  assert.equal(result.versions[0].price, 79);
  assert.equal(result.versions[0].productId, enabled.productId);
  assert.equal(result.versions[0].priceSource, 'cms-reference');
  for (const token of ['private-web-checkout', 'WEBONLY', 'private-video', 'web billing', 'discountedPrice']) {
    assert.equal(JSON.stringify(result).includes(token), false);
  }
});

test('inactive plans and disabled or invalid Apple versions are excluded', () => {
  const api = service();
  assert.equal(api.toApplePlan('plan', { ...plan, isActive: false }), null);
  for (const appleConfig of [{ ...enabled, enabled: false }, { ...enabled, productId: '' }, { ...enabled, price: -1 }]) {
    assert.equal(api.toApplePlan('plan', { ...plan, versions: [{ ...plan.versions[0], apple: appleConfig }] }), null);
  }
});

test('catalog loads and sorts only Apple plans; missing details return null', async () => {
  const docs = [
    { id: 'b', data: () => ({ ...plan, name: 'B', sortOrder: 2 }) },
    { id: 'hidden', data: () => ({ ...plan, isActive: false }) },
    { id: 'a', data: () => ({ ...plan, name: 'A', sortOrder: 1 }) },
  ];
  const api = service({ collection: () => ({ get: async () => ({ docs }), doc: id => ({ get: async () => ({ exists: false, id }) }) }) });
  assert.deepEqual(Array.from(await api.listApplePlans(), p => p.id), ['a', 'b']);
  assert.equal(await api.getApplePlan('missing'), null);
});

test('plan create and update persist independent Apple and web pricing', async () => {
  const writes = [];
  const db = { collection: () => ({
    add: async value => { writes.push(value); return { id: 'new' }; },
    doc: () => ({ update: async value => writes.push(value) }),
  }) };
  const api = load('lib/server/pricingService.ts', {
    '@/lib/apple-plans': apple,
    '@/lib/firebaseAdmin': { getAdminDb: () => db },
    'firebase-admin/firestore': { FieldValue: { serverTimestamp: () => 'timestamp' } },
    '@/lib/pricingPresets': { frcsPricingPresets: [] },
  });
  const input = api.parsePricingPlanInput(plan);
  assert.equal(api.validatePricingPlanInput(input), null);
  await api.createPricingPlan(input);
  await api.updatePricingPlan('new', input);
  for (const write of writes) {
    assert.equal(write.price, 49);
    assert.deepEqual(plain(write.versions[0].apple), enabled);
  }
  const duplicate = api.parsePricingPlanInput({ ...plan, versions: [plan.versions[0], { ...plan.versions[0], id: 'six', months: 6 }] });
  assert.match(api.validatePricingPlanInput(duplicate), /distinct App Store product ID/);
});

test('Apple routes return correct list, detail, unavailable and error responses', async () => {
  const modules = {
    'next/server': { NextResponse: { json: (body, init = {}) => ({ body, status: init.status || 200, headers: init.headers }) } },
    '@/lib/server/applePlanService': { listApplePlans: async () => ['apple-plan'], getApplePlan: async id => id === 'found' ? { id } : null },
  };
  const list = load('app/api/plans/apple/route.ts', modules);
  const detail = load('app/api/plans/apple/[id]/route.ts', modules);
  assert.equal((await list.GET()).headers['Cache-Control'], 'no-store');
  assert.equal((await detail.GET(null, { params: Promise.resolve({ id: 'found' }) })).status, 200);
  assert.equal((await detail.GET(null, { params: Promise.resolve({ id: 'missing' }) })).status, 404);
  assert.equal((await detail.GET(null, { params: Promise.resolve({ id: 'bad/id' }) })).status, 400);
  modules['@/lib/server/applePlanService'].listApplePlans = async () => { throw new Error('private database error'); };
  const error = await list.GET();
  assert.equal(error.status, 500);
  assert.equal(JSON.stringify(error).includes('private database error'), false);
});

test('admin reload retains Apple settings independently of the web version', async () => {
  const db = { collection: name => {
    const query = { orderBy: () => query, where: () => query, limit: () => query,
      get: async () => ({ docs: name === 'pricingPlans' ? [{ id: 'plan', data: () => plan }] : [] }) };
    return query;
  } };
  const api = load('lib/server/pricingService.ts', {
    '@/lib/apple-plans': apple,
    '@/lib/firebaseAdmin': { getAdminDb: () => db },
    'firebase-admin/firestore': { FieldValue: {} },
    '@/lib/pricingPresets': { frcsPricingPresets: [] },
  });
  const result = await api.loadPricingAdminData();
  assert.deepEqual(plain(result.plans[0].versions[0].apple), enabled);
  assert.equal(result.plans[0].versions[0].price, 49);
});
