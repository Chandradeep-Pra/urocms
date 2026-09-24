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
    '@/lib/apple-plans': apple,
    '@/lib/firebaseAdmin': { getAdminDb: () => db },
    'firebase-admin/firestore': { FieldValue: { arrayUnion: (...items) => items } },
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

test('findPlanByAppleProductId resolves plan metadata and course scopes for valid product IDs', async () => {
  const docs = [
    { id: 'frcs-plan', data: () => ({ ...plan, accessScopes: { courseIds: ['course-frcs'] } }) },
  ];
  const api = service({ collection: () => ({ get: async () => ({ docs }) }) });
  const found = await api.findPlanByAppleProductId('com.example.plan.3months');
  assert.ok(found);
  assert.equal(found.planId, 'frcs-plan');
  assert.equal(found.versionId, 'three');
  assert.equal(found.months, 3);
  assert.equal(found.price, 79);
  assert.deepEqual(found.courseIds, ['course-frcs']);

  const missing = await api.findPlanByAppleProductId('nonexistent.product');
  assert.equal(missing, null);
});

test('verifyAndFulfillApplePurchase fulfills transaction, grants entitlements, and is idempotent', async () => {
  const store = new Map();
  const writes = [];
  const db = {
    collection: (name) => ({
      doc: (id = `doc_${Math.random()}`) => {
        const fullId = `${name}/${id}`;
        return {
          id,
          get: async () => ({
            exists: store.has(fullId),
            data: () => store.get(fullId),
          }),
          set: async (val, opts) => {
            const current = store.get(fullId) || {};
            const next = opts?.merge ? { ...current, ...val } : val;
            store.set(fullId, next);
            writes.push({ fullId, val: next });
          },
        };
      },
      get: async () => ({
        docs: [{ id: 'plan-1', data: () => ({ ...plan, accessScopes: { courseIds: ['course-1'] } }) }],
      }),
    }),
    runTransaction: async (fn) => {
      const tx = {
        get: async (ref) => ref.get(),
        set: (ref, val, opts) => ref.set(val, opts),
      };
      return fn(tx);
    },
  };

  const api = service(db);

  // Initial purchase
  const result = await api.verifyAndFulfillApplePurchase({
    userId: 'user-123',
    userEmail: 'candidate@example.com',
    userName: 'Dr. Candidate',
    productId: 'com.example.plan.3months',
    transactionId: 'apple-tx-999',
  });

  assert.equal(result.alreadyCompleted, false);
  assert.equal(result.planId, 'plan-1');
  assert.ok(result.accessEndsAt);

  // Verify user doc was updated
  const user = store.get('users/user-123');
  assert.equal(user.tier, 'paid');
  assert.equal(user.activePlanId, 'plan-1');
  assert.equal(user.activePlanStatus, 'active');
  assert.ok(user.planExpiresAt);

  // Verify course entitlement was granted
  const entitlement = store.get('courseEntitlements/user-123_course-1');
  assert.equal(entitlement.status, 'ACTIVE');
  assert.equal(entitlement.planId, 'plan-1');

  // Verify idempotency with duplicate transaction call
  const duplicate = await api.verifyAndFulfillApplePurchase({
    userId: 'user-123',
    productId: 'com.example.plan.3months',
    transactionId: 'apple-tx-999',
  });
  assert.equal(duplicate.alreadyCompleted, true);

  // Verify rejection if a different user attempts to claim the same transaction ID
  await assert.rejects(
    () => api.verifyAndFulfillApplePurchase({
      userId: 'other-user',
      productId: 'com.example.plan.3months',
      transactionId: 'apple-tx-999',
    }),
    /already linked to another account/
  );
});

test('Apple purchase verification API route validates inputs and handles outcomes', async () => {
  let authUser = { uid: 'user-abc', email: 'test@example.com', name: 'Tester' };
  let fulfilled = false;
  const modules = {
    'next/server': {
      NextResponse: { json: (body, init = {}) => ({ body, status: init.status || 200 }) },
    },
    '@/lib/server/appSession': {
      requireAppUser: async () => authUser ? { user: authUser } : { response: { status: 401, body: { error: 'Unauthorized' } } },
    },
    '@/lib/server/applePlanService': {
      verifyAndFulfillApplePurchase: async (input) => {
        if (input.productId === 'bad.id') throw new Error("No active Apple plan found matching product ID 'bad.id'");
        fulfilled = true;
        return { alreadyCompleted: false, planId: 'plan-xyz', accessEndsAt: '2026-12-31T00:00:00.000Z' };
      },
    },
  };

  const route = load('app/api/plans/apple/verify/route.ts', modules);

  // Missing productId
  const badReq = await route.POST({ json: async () => ({ transactionId: 'tx-1' }) });
  assert.equal(badReq.status, 400);

  // Successful verification
  const okReq = await route.POST({
    json: async () => ({ productId: 'com.urologics.plan.3m', transactionId: 'tx-123' }),
  });
  assert.equal(okReq.status, 200);
  assert.equal(okReq.body.success, true);
  assert.equal(fulfilled, true);

  // Plan not found -> 404
  const notFoundReq = await route.POST({
    json: async () => ({ productId: 'bad.id', transactionId: 'tx-123' }),
  });
  assert.equal(notFoundReq.status, 404);
});
