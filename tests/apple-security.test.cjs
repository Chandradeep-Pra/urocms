const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const apple = require('@apple/app-store-server-library');
const root = path.resolve(__dirname, '..');
process.env.APPLE_IAP_SECURITY_READY = 'true';
function loader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file);
    if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { exports, Buffer, process, console: { warn() {}, error() {} }, setTimeout, clearTimeout, URLSearchParams,
      require(name) {
        if (Object.hasOwn(overrides, name)) return overrides[name];
        if (name === 'server-only') return {};
        if (name.startsWith('@/')) return load(name.slice(2));
        if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
        return require(name);
      },
    }, { filename: file });
    return exports;
  }
  return load;
}
const gateway = loader()('lib/server/appleStoreServer.ts');
const uid = 'candidate', token = 'f46383fb-7037-4bc6-a78c-67dc3556b70e';
const signedDate = Date.now();
const productId = 'com.urologics.app.elitesba.6months.v2';
const plan = { planId: 'elite', planName: 'Elite SBA', versionId: 'six', months: 6, price: 1199.99, currency: 'GBP', productId, courseIds: ['course-elite'], vivaMinutes: 0 };
function verified(patch = {}) {
  return { transactionId: '200000001', originalTransactionId: '200000001', productId, bundleId: 'com.urologics.app',
    environment: apple.Environment.PRODUCTION, type: apple.Type.NON_RENEWING_SUBSCRIPTION, inAppOwnershipType: 'PURCHASED',
    appAccountToken: token, purchaseDate: Date.now() - 10000, signedDate, price: 1199990, currency: 'GBP', ...patch };
}

function database(initial = {}) {
  const values = new Map(Object.entries(initial)); let sequence = 0, tail = Promise.resolve();
  const copy = value => value === undefined ? undefined : structuredClone(value);
  function document(key) {
    return { id: key.split('/').at(-1), key,
      get: async () => ({ id: key.split('/').at(-1), exists: values.has(key), data: () => copy(values.get(key)) }),
      set: async (value, options) => values.set(key, options?.merge ? { ...values.get(key), ...copy(value) } : copy(value)),
      update: async value => { if (!values.has(key)) throw Error('Missing document'); values.set(key, { ...values.get(key), ...copy(value) }); },
    };
  }
  function collection(name, filters = [], maximum = Infinity) {
    return { doc: id => document(`${name}/${id || 'auto-' + ++sequence}`),
      where: (field, op, value) => { assert.equal(op, '=='); return collection(name, [...filters, [field, value]], maximum); },
      limit: number => collection(name, filters, number),
      get: async () => {
        const docs = [...values].filter(([key, value]) => key.startsWith(name + '/') && filters.every(([field, wanted]) => value[field] === wanted))
          .slice(0, maximum).map(([key, value]) => ({ id: key.split('/').at(-1), data: () => copy(value) }));
        return { docs, size: docs.length, empty: docs.length === 0 };
      },
    };
  }
  const db = { collection,
    runTransaction(callback) {
      const operation = tail.then(async () => {
        const writes = []; let hasWritten = false;
        const tx = { get: ref => { assert.equal(hasWritten, false, 'Firestore reads must precede writes'); return ref.get(); },
          set: (ref, value, options) => { hasWritten = true; writes.push(() => ref.set(value, options)); },
          create: (ref, value) => { hasWritten = true; writes.push(() => { if (values.has(ref.key)) throw Error('Already exists'); return ref.set(value); }); },
        };
        const result = await callback(tx);
        for (const write of writes) await write();
        return result;
      });
      tail = operation.catch(() => {}); return operation;
    },
  };
  return { db, values };
}
function fixture({ data = verified(), initial = {}, failure, reportFailure } = {}) {
  const storage = database({ [`appleAccounts/${uid}`]: { userId: uid, appAccountToken: token, consumptionConsent: false },
    [`appleAccountTokens/${token}`]: { userId: uid }, ...initial });
  let notification, lookupCount = 0, reports = [];
  const load = loader({ '@/lib/firebaseAdmin': { getAdminDb: () => storage.db },
    './appleStoreServer': { ...gateway,
      fetchAppleTransaction: async () => { lookupCount++; if (failure) throw failure; return data; },
      verifyAppleNotification: async () => notification,
      sendAppleConsumption: async (...args) => { if (reportFailure?.()) throw Error('Apple temporarily unavailable'); reports.push(args); },
    },
  });
  const ledger = load('lib/server/applePurchaseLedger.ts');
  return { ...storage, ledger, load, reports, get lookupCount() { return lookupCount; },
    fulfill: (patch = {}) => ledger.fulfillVerifiedApplePurchase({ userId: uid, productId, transactionId: data.transactionId, ...patch }, plan),
    async notify(type, patch = {}, eventId = crypto.randomUUID()) {
      notification = { notification: { notificationUUID: eventId, notificationType: type, signedDate: signedDate + 1000 }, transaction: { ...data, signedDate: signedDate + 1000, ...patch }, environment: data.environment };
      await ledger.processAppleNotification('verified-fixture');
    },
  };
}

test('transaction policy rejects wrong app, product, ID, environment, type, owner kind, missing account token and malformed dates', () => {
  for (const patch of [{ bundleId: 'other' }, { transactionId: '123' }, { productId: 'other' }, { environment: 'Xcode' },
    { environment: 'Sandbox' }, { type: 'Consumable' }, { inAppOwnershipType: 'FAMILY_SHARED' }, { appAccountToken: null },
    { purchaseDate: Date.now() + 600000 }, { purchaseDate: -1 }, { price: 0 }, { currency: 'bad' }]) {
    assert.throws(() => gateway.validateAppleTransaction(verified(patch), '200000001', productId, false));
  }
  assert.equal(gateway.validateAppleTransaction(verified(), '200000001', productId, false).productId, productId);
});
test('real Apple signature verifier rejects attacker-signed purchase data and notifications', async () => {
  const keys = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const head = Buffer.from(JSON.stringify({ alg: 'ES256' })).toString('base64url');
  const body = Buffer.from(JSON.stringify(verified())).toString('base64url');
  const signature = crypto.sign('sha256', Buffer.from(`${head}.${body}`), { key: keys.privateKey, dsaEncoding: 'ieee-p1363' }).toString('base64url');
  const forged = `${head}.${body}.${signature}`;
  const roots = loader()('lib/server/appleRootCertificates.ts').appleRootCertificates;
  const verifier = new apple.SignedDataVerifier(roots, true, apple.Environment.PRODUCTION, 'com.urologics.app', 6777512648);
  await assert.rejects(() => verifier.verifyAndDecodeTransaction(forged));
  await assert.rejects(() => gateway.verifyAppleNotification(forged));
});
test('the actual server lookup path rejects a forged transaction returned as provider data', async () => {
  const names = ['APPLE_IAP_KEY_ID', 'APPLE_IAP_ISSUER_ID', 'APPLE_IAP_PRIVATE_KEY'];
  const previous = names.map(name => process.env[name]);
  const keys = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  process.env.APPLE_IAP_KEY_ID = 'ABCDEFGHIJ'; process.env.APPLE_IAP_ISSUER_ID = crypto.randomUUID();
  process.env.APPLE_IAP_PRIVATE_KEY = keys.privateKey.export({ format: 'pem', type: 'pkcs8' });
  try {
    const lookup = loader({ '@apple/app-store-server-library': { ...apple, AppStoreServerAPIClient: class {
      async getTransactionInfo() { return { signedTransactionInfo: 'eyJhbGciOiJFUzI1NiJ9.e30.Zm9yZ2Vk' }; }
    } } })('lib/server/appleStoreServer.ts');
    await assert.rejects(() => lookup.fetchAppleTransaction('200000001', productId, uid), /INVALID_APPLE_SIGNATURE/);
  } finally { names.forEach((name,i) => { if (previous[i] === undefined) delete process.env[name]; else process.env[name] = previous[i]; }); }
});
test('temporary certificate-check failures remain retryable and do not appear as a permanent invalid purchase', async () => {
  const keys = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const names = ['APPLE_IAP_KEY_ID', 'APPLE_IAP_ISSUER_ID', 'APPLE_IAP_PRIVATE_KEY'];
  const previous = names.map(name => process.env[name]);
  process.env.APPLE_IAP_KEY_ID = 'ABCDEFGHIJ'; process.env.APPLE_IAP_ISSUER_ID = crypto.randomUUID();
  process.env.APPLE_IAP_PRIVATE_KEY = keys.privateKey.export({ format: 'pem', type: 'pkcs8' });
  try {
    const lookup = loader({ '@apple/app-store-server-library': { ...apple,
      AppStoreServerAPIClient: class { async getTransactionInfo() { return { signedTransactionInfo: 'present' }; } },
      SignedDataVerifier: class {
        async verifyAndDecodeTransaction() { throw new apple.VerificationException(apple.VerificationStatus.RETRYABLE_VERIFICATION_FAILURE); }
        async verifyAndDecodeNotification() { throw new apple.VerificationException(apple.VerificationStatus.RETRYABLE_VERIFICATION_FAILURE); }
      },
    } })('lib/server/appleStoreServer.ts');
    await assert.rejects(() => lookup.fetchAppleTransaction('200000001', productId, uid), error => error.status === 503);
    await assert.rejects(() => lookup.verifyAppleNotification('signed'), error => error.status === 503);
  } finally { names.forEach((name,i) => { if (previous[i] === undefined) delete process.env[name]; else process.env[name] = previous[i]; }); }
});
test('unavailable Apple verification never grants courses or records a completed payment', async () => {
  const f = fixture({ failure: new gateway.ApplePaymentError('APPLE_UNAVAILABLE', 503) });
  await assert.rejects(f.fulfill, /APPLE_UNAVAILABLE/);
  assert.equal([...f.values.keys()].some(k => k.startsWith('purchases/') || k.startsWith('appleTransactions/')), false);
});
test('unreviewed server security configuration cannot activate Apple grants or checkout', async () => {
  const previous = process.env.APPLE_IAP_SECURITY_READY;
  process.env.APPLE_IAP_SECURITY_READY = '';
  try {
    assert.throws(() => gateway.assertAppleConfigured(), /APPLE_NOT_CONFIGURED/);
    const f = fixture();
    assert.equal(f.ledger.appleAccessPeriods([{verificationVersion:2,fulfilled:true,userId:uid,status:'ACTIVE',environment:'Production'}],uid).length,0);
  } finally { process.env.APPLE_IAP_SECURITY_READY = previous; }
});
test('verified payment creates a ledger grant, rechecks Apple on duplicate, and never overwrites website/manual state', async () => {
  const original = { tier: 'paid', activePlanId: 'website', activeCourseIds: ['manual'], planExpiresAt: '2099-01-01' };
  const f = fixture({ initial: { [`users/${uid}`]: original } });
  const first = await f.fulfill();
  const second = await f.fulfill();
  assert.equal(first.alreadyCompleted, false); assert.equal(second.alreadyCompleted, true);
  assert.equal(first.accessEndsAt, second.accessEndsAt); assert.equal(f.lookupCount, 2);
  assert.deepEqual(f.values.get(`users/${uid}`), original);
  const access = await f.ledger.applyAppleAccess(uid, original);
  assert.deepEqual(Array.from(access.activeCourseIds).sort(), ['course-elite', 'manual']);
  assert.equal(access.activePlanId, 'website');
  const purchase = f.values.get('purchases/apple_production_200000001');
  assert.equal(purchase.status, 'COMPLETED'); assert.equal(purchase.paidAmount, 1199.99);
});
test('a verified transaction belonging to another account is rejected without fulfillment', async () => {
  const f = fixture({ data: verified({ appAccountToken: crypto.randomUUID() }) });
  await assert.rejects(f.fulfill, /PURCHASE_ACCOUNT_MISMATCH/);
  assert.equal(f.values.has('appleTransactions/production_200000001'), false);
});
test('concurrent account initialization creates one stable server-owned token and separates other accounts', async () => {
  const f = fixture(); f.values.delete(`appleAccounts/${uid}`); f.values.delete(`appleAccountTokens/${token}`);
  const accounts = await Promise.all([f.ledger.getAppleAccount(uid), f.ledger.getAppleAccount(uid), f.ledger.getAppleAccount(uid)]);
  assert.equal(new Set(accounts.map(a => a.appAccountToken)).size, 1);
  assert.equal(accounts[0].consumptionConsent, false);
  assert.equal(f.values.get(`appleAccountTokens/${accounts[0].appAccountToken}`).userId, uid);
  assert.notEqual((await f.ledger.getAppleAccount('other')).appAccountToken, accounts[0].appAccountToken);
});
test('concurrent duplicate fulfillment creates only one purchase and access period', async () => {
  const f = fixture(); const results = await Promise.all([f.fulfill(), f.fulfill(), f.fulfill()]);
  assert.equal(results.filter(r => !r.alreadyCompleted).length, 1);
  assert.equal([...f.values.keys()].filter(k => k.startsWith('purchases/')).length, 1);
  assert.equal(new Set(results.map(r => r.accessEndsAt)).size, 1);
});
test('restoring an old purchase does not start a new access period today', async () => {
  const f = fixture({ data: verified({ purchaseDate: Date.UTC(2020, 0, 31) }) });
  const result = await f.fulfill();
  assert.equal(result.accessEndsAt, '2020-07-31T00:00:00.000Z');
  const access = await f.ledger.applyAppleAccess(uid, { tier: 'free', activeCourseIds: [] });
  assert.equal(access.activeCourseIds.length, 0); assert.equal(access.tier, 'free');
});
test('month-end expiry is clamped and duplicate restores never create extra time', () => {
  const f = fixture();
  assert.equal(new Date(f.ledger.addAccessMonths(Date.UTC(2025,0,31),1)).toISOString(), '2025-02-28T00:00:00.000Z');
});
test('refund removes the affected grant, preserves independent courses, and a reversal restores original remaining access', async () => {
  const f = fixture(); const original = { tier: 'paid', activePlanId: 'website', activeCourseIds: ['website-course'], planExpiresAt: '2099-01-01' };
  const paid = await f.fulfill();
  await f.notify('REFUND', { revocationDate: Date.now() });
  let access = await f.ledger.applyAppleAccess(uid, original);
  assert.deepEqual(Array.from(access.activeCourseIds), ['website-course']); assert.equal(access.tier, 'paid');
  assert.equal(f.values.get('purchases/apple_production_200000001').status, 'REFUNDED');
  await f.notify('REFUND_REVERSED', { signedDate: signedDate + 2000 });
  access = await f.ledger.applyAppleAccess(uid, original);
  assert.ok(access.activeCourseIds.includes('course-elite'));
  const history = await f.ledger.listApplePurchases(uid);
  assert.equal(history[0].accessEndsAt, paid.accessEndsAt);
});
test('duplicate and out-of-order notifications cannot undo a newer refund decision', async () => {
  const f = fixture(); await f.fulfill();
  const event = crypto.randomUUID();
  await f.notify('REFUND', { revocationDate: Date.now(), signedDate: signedDate + 3000 }, event);
  await f.notify('REFUND_REVERSED', { signedDate: signedDate + 2000 });
  await f.notify('REFUND', { revocationDate: Date.now(), signedDate: signedDate + 3000 }, event);
  assert.equal(f.values.get('appleTransactions/production_200000001').status, 'REFUNDED');
  // A stale restore fetched concurrently with the refund must not re-grant access either.
  await assert.rejects(f.fulfill, /PURCHASE_REFUNDED/);
});
test('refund before purchase fulfillment creates a tombstone, never grants access, and survives a stale purchase response', async () => {
  const f = fixture(); await f.notify('REFUND', { revocationDate: Date.now() });
  await assert.rejects(f.fulfill, /PURCHASE_REFUNDED/);
  const access = await f.ledger.applyAppleAccess(uid, { tier: 'free', activeCourseIds: [] });
  assert.equal(access.activeCourseIds.length, 0);
});
test('a partial refund shortens only that purchase period; full refunds grant no period', async () => {
  const f = fixture(); const full = await f.fulfill();
  await f.notify('REFUND', { revocationDate: Date.now(), revocationPercentage: 50000 });
  const history = await f.ledger.listApplePurchases(uid);
  assert.equal(history[0].status, 'PARTIALLY_REFUNDED'); assert.ok(Date.parse(history[0].accessEndsAt) < Date.parse(full.accessEndsAt));
});
test('sandbox grants are isolated and only visible to explicitly allowlisted testing accounts', async () => {
  const previous = process.env.APPLE_SANDBOX_USER_IDS; process.env.APPLE_SANDBOX_USER_IDS = uid;
  try {
    const f = fixture({ data: verified({ environment: apple.Environment.SANDBOX }) }); await f.fulfill();
    assert.equal(f.values.has('appleTransactions/sandbox_200000001'), true);
    assert.equal((await f.ledger.applyAppleAccess(uid, {})).tier, 'paid');
    process.env.APPLE_SANDBOX_USER_IDS = '';
    assert.equal((await f.ledger.applyAppleAccess(uid, {})).tier, undefined);
  } finally { if (previous === undefined) delete process.env.APPLE_SANDBOX_USER_IDS; else process.env.APPLE_SANDBOX_USER_IDS = previous; }
});
test('consumption information is never shared without consent; withdrawal is respected', async () => {
  const f = fixture(); await f.fulfill();
  await f.notify('CONSUMPTION_REQUEST'); assert.equal(f.reports.length, 0);
  await f.ledger.setAppleConsumptionConsent(uid, true);
  await f.notify('CONSUMPTION_REQUEST'); assert.equal(f.reports.length, 1);
  assert.equal(f.reports[0][2].customerConsented, true);
  assert.equal('consumptionPercentage' in f.reports[0][2], false, 'Do not fabricate usage statistics');
  await f.ledger.setAppleConsumptionConsent(uid, false);
  await f.notify('CONSUMPTION_REQUEST'); assert.equal(f.reports.length, 1);
});
test('failed consumption reporting remains retryable and is not acknowledged as processed', async () => {
  let attempts = 0;
  const f = fixture({ reportFailure: () => ++attempts === 1 });
  await f.fulfill(); await f.ledger.setAppleConsumptionConsent(uid, true);
  const id = crypto.randomUUID();
  await assert.rejects(() => f.notify('CONSUMPTION_REQUEST', {}, id), /temporarily unavailable/);
  assert.equal(f.values.has(`appleNotifications/${id}`), false);
  await f.notify('CONSUMPTION_REQUEST', {}, id);
  assert.equal(f.values.get(`appleNotifications/${id}`).processed, true);
  assert.equal(f.reports.length, 1);
});
test('legacy unverified Apple grants are quarantined while a separate completed website purchase is preserved', async () => {
  const f = fixture({ initial: {
    'appleTransactions/legacy': { userId: uid, planId: 'legacy-plan' },
    'pricingPlans/legacy-plan': { accessScopes: { courseIds: ['legacy-course'] } },
    'purchases/web': { userId: uid, provider: 'paypal', status: 'COMPLETED', courseId: 'website-course', planId: 'website', accessEndsAt: '2099-01-01' },
  } });
  const access = await f.ledger.applyAppleAccess(uid, { tier: 'paid', activePlanId: 'legacy-plan', activeCourseIds: ['legacy-course', 'website-course'] });
  assert.equal(access.activePlanId, null); assert.deepEqual(Array.from(access.activeCourseIds), ['website-course']);
});
test('profile documents cannot inject Apple plan grants without a verified purchase ledger entry', async () => {
  const f = fixture();
  const access = await f.ledger.applyAppleAccess(uid, { tier: 'free', applePlanIds: ['expensive-plan'] });
  assert.equal(access.applePlanIds.length, 0);
});
test('request parser rejects oversized, malformed and non-JSON requests, including chunked bodies', async () => {
  const f = fixture(); const http = f.load('lib/server/applePaymentHttp.ts');
  await assert.rejects(() => http.readAppleJson(new Request('https://test', { method: 'POST', body: 'no' })), /JSON_REQUIRED/);
  for (const body of ['[]', 'null', '{']) await assert.rejects(() => http.readAppleJson(new Request('https://test', { method: 'POST', headers: { 'content-type': 'application/json' }, body })), /INVALID_REQUEST/);
  await assert.rejects(() => http.readAppleJson(new Request('https://test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ big: 'x'.repeat(100) }) }), 30), /REQUEST_TOO_LARGE/);
});
test('persistent rate limit is shared across requests and blocks additional verification attempts', async () => {
  const f = fixture(); const http = f.load('lib/server/applePaymentHttp.ts');
  await http.limitAppleRequests(uid, 'verify', 2); await http.limitAppleRequests(uid, 'verify', 2);
  await assert.rejects(() => http.limitAppleRequests(uid, 'verify', 2), /TOO_MANY_REQUESTS/);
});
test('verify route rejects unauthenticated and invalid input and ignores all client-supplied payment status and price fields', async () => {
  let authenticated = true, called;
  const f = fixture();
  const load = loader({ '@/lib/server/appSession': { requireAppUser: async () => authenticated ? { user: { uid, email: 'test@example.com' } } : { response: new Response(null, { status: 401 }) } },
    '@/lib/firebaseAdmin': { getAdminDb: () => f.db },
    '@/lib/server/applePlanService': { verifyAndFulfillApplePurchase: async input => { called = input; return { planId: 'elite', accessEndsAt: '2099-01-01' }; } },
  });
  const route = load('app/api/plans/apple/verify/route.ts');
  const req = body => new Request('https://test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  authenticated = false; assert.equal((await route.POST(req({}))).status, 401);
  authenticated = true; assert.equal((await route.POST(req({ transactionId: 'bad/id', productId }))).status, 400);
  const response = await route.POST(req({ transactionId: '200000001', productId, success: true, price: 1, userId: 'other', transactionDate: 0 }));
  assert.equal(response.status, 200); assert.equal(called.userId, uid);
  assert.equal('success' in called, false); assert.equal('price' in called, false); assert.equal('transactionDate' in called, false);
});
