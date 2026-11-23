const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const crypto = require('node:crypto');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');

function loader(overrides = {}) {
  const cache = new Map();
  function load(file) {
    file = path.resolve(root, file); if (!path.extname(file)) file += '.ts';
    if (cache.has(file)) return cache.get(file);
    const exports = {}; cache.set(file, exports);
    const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true } }).outputText;
    vm.runInNewContext(code, { exports, Buffer, process, Date, Intl, Request, Response, Headers, AbortSignal, URL, URLSearchParams,
      setTimeout, clearTimeout, console: { warn() {}, error() {} }, fetch: overrides.fetch || (async () => { throw new Error('Unexpected network request in payment tests'); }),
      require(name) {
        if (Object.hasOwn(overrides, name)) return overrides[name];
        if (name === 'server-only') return {};
        if (name.startsWith('.')) {
          const resolved = path.resolve(path.dirname(file), name);
          const alias = '@/' + path.relative(root, resolved).replaceAll('\\', '/');
          if (Object.hasOwn(overrides, alias)) return overrides[alias];
        }
        if (name.startsWith('@/')) return load(name.slice(2));
        if (name.startsWith('.')) return load(path.resolve(path.dirname(file), name));
        return require(name);
      },
    }, { filename: file }); return exports;
  }
  return load;
}
function database(initial = {}) {
  const values = new Map(Object.entries(initial)); let tail = Promise.resolve();
  const copy = value => value === undefined ? undefined : structuredClone(value);
  function document(key) {
    return { id: key.split('/').at(-1), key,
      get: async () => ({ id: key.split('/').at(-1), exists: values.has(key), data: () => copy(values.get(key)) }),
      set: async (value, options) => values.set(key, options?.merge ? { ...values.get(key), ...copy(value) } : copy(value)),
      update: async value => { if (!values.has(key)) throw Error('Missing document'); values.set(key, { ...values.get(key), ...copy(value) }); },
    };
  }
  function collection(name, filters = [], maximum = Infinity, order) {
    return { doc: id => document(`${name}/${id}`),
      where: (field, op, value) => collection(name, [...filters, [field, op, value]], maximum, order),
      orderBy: field => collection(name, filters, maximum, field), limit: size => collection(name, filters, size, order),
      get: async () => {
        let records = [...values].filter(([key, value]) => key.startsWith(name + '/') && filters.every(([field, op, wanted]) => op === '==' ? value[field] === wanted : value[field] != null && value[field] <= wanted));
        if (order) records.sort((a, b) => a[1][order] - b[1][order]);
        const docs = records.slice(0, maximum).map(([key, value]) => ({ id: key.split('/').at(-1), ref: document(key), exists: true, data: () => copy(value) }));
        return { docs, size: docs.length, empty: docs.length === 0 };
      },
    };
  }
  const db = { collection, runTransaction(callback) {
    const result = tail.then(async () => {
      const writes = []; let written = false;
      const tx = { get(ref) { assert.equal(written, false, 'Firestore reads must precede writes'); return ref.get(); },
        set(ref, value, options) { written = true; writes.push(() => ref.set(value, options)); },
        update(ref, value) { written = true; writes.push(() => ref.update(value)); },
        create(ref, value) { written = true; writes.push(() => { if (values.has(ref.key)) throw Error('Already exists'); return ref.set(value); }); },
      };
      const value = await callback(tx); for (const write of writes) await write(); return value;
    }); tail = result.catch(() => {}); return result;
  } };
  return { db, values };
}
const env = { PAYPAL_MODE: 'live', PAYPAL_CLIENT_ID: 'test-client', PAYPAL_CLIENT_SECRET: 'test-secret', PAYPAL_MERCHANT_ID: '', PAYPAL_WEBHOOK_ID: 'WEBHOOK123',
  PAYPAL_SECURITY_READY: 'false', PAYPAL_PAYMENTS_ENABLED: 'false', PAYPAL_PAY_LATER_ENABLED: 'true', TAX: '0' };
Object.assign(process.env, env);
const pure = loader()('lib/paypal-payments.ts');
const gateway = loader()('lib/server/paypalService.ts');
const buyer = { uid: 'buyer', email: 'buyer@example.test', name: 'Buyer' };
const input = { planId: 'plan', versionId: 'three', courseId: 'course', attemptId: '6bcf6c6d-325d-4013-b29e-ac6e44e12b66', checkoutIntent: 'paylater' };
function fixture(extra = {}) {
  const storage = database({ 'pricingPlans/plan': { name: 'Plan', isActive: true, accessScopes: { courseIds: ['course'] }, versions: [{ id: 'three', months: 3, price: 300, payLaterEnabled: true }] },
    'courses/course': { title: 'Course' }, 'users/buyer': { tier: 'free' }, ...extra });
  let order, captureStatus = 'COMPLETED', amount = '300.00', calls = 0, captureCalls = 0;
  const api = { ...gateway,
    async createPayPalOrder(data) { calls++; order ||= { id: 'ORDER123', status: 'APPROVED', purchase_units: [{ reference_id: data.purchaseId, custom_id: data.purchaseId,
      payee: { merchant_id: 'MERCHANT123' }, amount: { currency_code: 'GBP', value: data.amount.value } }] }; return structuredClone(order); },
    async getPayPalOrder() { const data = structuredClone(order); if (order.status === 'COMPLETED') data.purchase_units[0].payments = { captures: [{ id: 'CAPTURE123' }] }; return data; },
    async capturePayPalOrder() { captureCalls++; order.status = 'COMPLETED'; return api.getPayPalOrder(); },
    async getPayPalCapture() { return { id: 'CAPTURE123', status: captureStatus, amount: { currency_code: 'GBP', value: amount }, create_time: new Date(Date.now() - 1000).toISOString() }; },
    async paypalFetch() { return { id: 'REFUND123', status: 'COMPLETED', amount: { value: '100.00', currency_code: 'GBP' } }; },
    async verifyPayPalWebhook() {},
  };
  const load = loader({ '@/lib/firebaseAdmin': { getAdminDb: () => storage.db }, '@/lib/server/paypalService': api,
    '@/lib/server/emailService': { sendPurchaseConfirmationEmail: async () => {} },
    '@/lib/server/appSession': { requireAppUser: async () => ({ user: buyer }) },
  });
  return { ...storage, load, service: load('lib/server/paypalPaymentService.ts'), purchase: load('lib/server/purchaseService.ts'), api,
    get order() { return order; }, get calls() { return calls; }, get captureCalls() { return captureCalls; },
    set captureStatus(value) { captureStatus = value; }, set amount(value) { amount = value; } };
}
const req = body => new Request('https://test', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });

test('money rejects fractional pence, negatives, exponents and unsafe integers', () => {
  for (const value of ['1.001', '-1', '1e3', 'NaN', '9007199254740992', Infinity]) assert.throws(() => pure.amountToMinor(value));
  assert.equal(pure.amountToMinor('99.99'), 9999); assert.equal(pure.minorToAmount(10001), '100.01');
});
test('calendar access clamps January 31 and leap day correctly', () => {
  assert.equal(new Date(pure.addMonthsClamped(Date.parse('2024-01-31T10:00:00Z'), 1)).toISOString(), '2024-02-29T10:00:00.000Z');
  assert.equal(new Date(pure.addMonthsClamped(Date.parse('2024-02-29T10:00:00Z'), 12)).toISOString(), '2025-02-28T10:00:00.000Z');
});
test('reminders use local calendar days and stop after the saved date without inferring overdue status', () => {
  const reminder = pure.parsePayPalReminder({ enabled: true, dates: ['2026-11-26'], timeZone: 'Asia/Kolkata' });
  assert.equal(pure.upcomingPayPalReminders(reminder, new Date('2026-11-22T20:00:00Z'))[0].days, 3);
  assert.equal(pure.upcomingPayPalReminders(reminder, new Date('2026-11-26T20:00:00Z')).length, 0);
  assert.equal(pure.upcomingPayPalReminders({ ...reminder, dismissedDates: reminder.dates }, new Date('2026-11-23')).length, 0);
  assert.equal(reminder.source, 'customer');
});
test('reminders reject impossible dates, duplicates, invalid timezones and more than two repayments', () => {
  for (const patch of [{ dates: ['2026-02-30'] }, { dates: ['2026-11-26', '2026-11-26'] }, { dates: ['2026-11-26', '2026-11-27', '2026-11-28'] }, { timeZone: 'Invalid/Timezone' }, { dates: [] }])
    assert.throws(() => pure.parsePayPalReminder({ enabled: true, dates: ['2026-11-26'], timeZone: 'UTC', ...patch }));
});
test('standard checkout needs only credentials and supports the existing production mode alias', () => {
  try {
    process.env.PAYPAL_WEBHOOK_ID = '';
    assert.equal(gateway.paypalPublicConfig().enabled, true);
    process.env.PAYPAL_MODE = 'production'; assert.equal(gateway.paypalEnvironment(), 'live');
    assert.equal(gateway.paypalSandboxAllowed(), false);
    process.env.PAYPAL_MODE = 'sandbox'; assert.equal(gateway.paypalPublicConfig().enabled, true);
    assert.equal(gateway.paypalSandboxAllowed(), true);
    process.env.PAYPAL_MODE = 'invalid'; assert.throws(() => gateway.paypalEnvironment(), /INVALID_PAYPAL_MODE/);
    process.env.PAYPAL_MODE = 'live'; process.env.PAYPAL_CLIENT_SECRET = '';
    assert.throws(() => gateway.paypalConfig(), /PAYPAL_NOT_READY/); assert.equal(gateway.paypalPublicConfig().enabled, false);
  } finally { Object.assign(process.env, env); }
});
test('provider order creation omits a manually supplied recipient', async () => {
  let sent;
  const api = loader({ fetch: async (url, options) => {
    assert.ok(String(url).startsWith('https://api-m.paypal.com/'));
    if (String(url).endsWith('/token')) return Response.json({ access_token: 'test-only', expires_in: 300 });
    sent = JSON.parse(options.body); return Response.json({ id: 'ORDER123' });
  } })('lib/server/paypalService.ts');
  await api.createPayPalOrder({ amount: { currency_code: 'GBP', value: '300.00' }, purchaseId: 'purchase', description: 'Plan' });
  assert.equal(Object.hasOwn(sent.purchase_units[0], 'payee'), false);
});
test('missing webhook configuration only blocks webhook verification', async () => {
  try {
    process.env.PAYPAL_WEBHOOK_ID = '';
    assert.equal(gateway.paypalPublicConfig().enabled, true);
    await assert.rejects(() => gateway.verifyPayPalWebhook(new Headers(), {}), /PAYPAL_WEBHOOK_NOT_CONFIGURED/);
  } finally { Object.assign(process.env, env); }
});
test('Pay Later defaults on without a deployment flag and respects an explicit global opt-out', async () => {
  try {
    delete process.env.PAYPAL_PAY_LATER_ENABLED;
    assert.equal(gateway.paypalPublicConfig().payLaterEnabled, true);
    const f = fixture(); await f.service.createPayment(buyer, input);
    process.env.PAYPAL_PAY_LATER_ENABLED = 'false';
    assert.equal(gateway.paypalPublicConfig().enabled, true);
    assert.equal(gateway.paypalPublicConfig().payLaterEnabled, false);
    const disabled = fixture();
    await assert.rejects(() => disabled.service.createPayment(buyer, input), /PAY_LATER_UNAVAILABLE/);
  } finally { Object.assign(process.env, env); }
});
test('same checkout attempt is persisted once and resumes the same provider order', async () => {
  const f = fixture(); const first = await f.service.createPayment(buyer, input); const second = await f.service.createPayment(buyer, input);
  assert.equal(first.orderId, second.orderId); assert.equal(f.calls, 1);
  assert.equal([...f.values.keys()].filter(k => k.startsWith('purchases/')).length, 1);
  assert.equal(f.values.get(`purchases/${first.purchaseId}`).status, 'CREATED');
  assert.equal(f.values.get(`purchases/${first.purchaseId}`).merchantId, 'MERCHANT123');
  assert.equal(f.values.get(`purchases/${first.purchaseId}`).paypalAccountKey, gateway.paypalConfig().accountKey);
});
test('an existing attempt cannot switch to different PayPal app credentials', async () => {
  const f = fixture(), created = await f.service.createPayment(buyer, input);
  try {
    process.env.PAYPAL_CLIENT_ID = 'different-app';
    await assert.rejects(() => f.service.createPayment(buyer, input), /PAYMENT_ATTEMPT_MISMATCH/);
    await assert.rejects(() => f.service.capturePayment(buyer.uid, created.orderId), /PAYMENT_ORDER_MISMATCH/);
  } finally { Object.assign(process.env, env); }
});
test('a malformed provider creation response cannot bind a purchase or grant access', async () => {
  for (const mutate of [u => delete u.payee, u => u.custom_id = 'other', u => u.amount.value = '1.00']) {
    const f = fixture(), create = f.api.createPayPalOrder;
    f.api.createPayPalOrder = async data => { const order = await create(data); mutate(order.purchase_units[0]); return order; };
    await assert.rejects(() => f.service.createPayment(buyer, input));
    const purchase = [...f.values].find(([key]) => key.startsWith('purchases/'))[1];
    assert.equal(purchase.status, 'CREATING'); assert.equal(purchase.merchantId, null);
    assert.equal(f.values.has('paypalOrders/ORDER123'), false);
  }
});
test('checkout ignores forged browser prices and freezes server-calculated integer money', async () => {
  const f = fixture(); const result = await f.service.createPayment(buyer, { ...input, price: 1, paidAmount: 1, userId: 'attacker', status: 'COMPLETED' });
  const record = f.values.get(`purchases/${result.purchaseId}`);
  assert.equal(record.amountMinor, 30000); assert.equal(record.userId, buyer.uid); assert.equal(record.status, 'CREATED');
});
test('an attempt cannot be reused for another plan or coupon', async () => {
  const f = fixture(); await f.service.createPayment(buyer, input);
  await assert.rejects(() => f.service.createPayment(buyer, { ...input, courseId: 'another' }), /PAYMENT_ATTEMPT_MISMATCH/);
});
test('Pay Later intent is rejected when the plan disables it', async () => {
  const f = fixture({ 'pricingPlans/plan': { isActive: true, accessScopes: { courseIds: ['course'] }, versions: [{ id: 'three', months: 3, price: 300, payLaterEnabled: false }] } });
  await assert.rejects(() => f.service.createPayment(buyer, input), /PAY_LATER_UNAVAILABLE/);
});
test('existing plan versions without a new Pay Later flag support eligible live checkout', async () => {
  const f = fixture({ 'pricingPlans/plan': { isActive: true, accessScopes: { courseIds: ['course'] }, versions: [{ id: 'three', months: 3, price: 300 }] } });
  const created = await f.service.createPayment(buyer, input);
  await f.service.capturePayment(buyer.uid, created.orderId);
  assert.equal(f.values.get(`purchases/${created.purchaseId}`).status, 'COMPLETED');
});
test('checkout details and quotes expose live Pay Later for existing plans without readiness gates', async () => {
  for (const enabled of [undefined, false]) {
    const version = { id: 'three', months: 3, price: 300, ...(enabled === false ? { payLaterEnabled: false } : {}) };
    const f = fixture({ 'pricingPlans/plan': { isActive: true, accessScopes: { courseIds: ['course'] }, versions: [version] } });
    const detailsResponse = await f.load('app/api/app/checkout/route.ts').GET({ nextUrl: new URL('https://checkout.test?planId=plan&versionId=three') });
    assert.equal(detailsResponse.status, 200);
    const details = await detailsResponse.json();
    assert.equal(details.paypal.enabled, true); assert.equal(details.paypal.environment, 'live');
    assert.equal(details.paypal.payLaterEnabled, enabled !== false);
    const quoteResponse = await f.load('app/api/paypal/quote/route.ts').POST(req(input));
    assert.equal(quoteResponse.status, 200);
    const quote = await quoteResponse.json();
    assert.equal(quote.payLaterEligible, enabled !== false); assert.equal(quote.amountMinor, 30000);
  }
});
test('another customer cannot capture an order', async () => {
  const f = fixture(); const result = await f.service.createPayment(buyer, input);
  await assert.rejects(() => f.service.capturePayment('attacker', result.orderId), /PURCHASE_NOT_FOUND/); assert.equal(f.captureCalls, 0);
});
test('mismatched merchant, references, currency or amount cannot complete a purchase', async () => {
  for (const mutate of [u => u.payee.merchant_id = 'ATTACKER', u => u.custom_id = 'other', u => u.reference_id = 'other', u => u.amount.value = '1.00', u => u.amount.currency_code = 'USD']) {
    const f = fixture(); const result = await f.service.createPayment(buyer, input); mutate(f.order.purchase_units[0]);
    await assert.rejects(() => f.service.capturePayment(buyer.uid, result.orderId)); assert.equal(f.values.get(`purchases/${result.purchaseId}`).status, 'CREATED');
  }
});
test('capture amount must match the order even when the order total is correct', async () => {
  const f = fixture(); const result = await f.service.createPayment(buyer, input); f.amount = '1.00';
  await assert.rejects(() => f.service.capturePayment(buyer.uid, result.orderId), /PAYMENT_AMOUNT_MISMATCH/);
  assert.equal([...f.values.keys()].some(k => k.startsWith('paypalCaptures/')), false);
});
test('duplicate and simultaneous completion grants access once without mutating manual membership', async () => {
  const manual = { tier: 'paid', activePlanId: 'manual-plan', activePlanStatus: 'active', activeCourseIds: ['manual-course'], planExpiresAt: '2099-01-01' };
  const f = fixture({ 'users/buyer': manual }); const result = await f.service.createPayment(buyer, input);
  await Promise.all([f.service.capturePayment(buyer.uid, result.orderId), f.service.capturePayment(buyer.uid, result.orderId)]);
  assert.equal([...f.values.keys()].filter(k => k.startsWith('paypalCaptures/')).length, 1);
  assert.deepEqual(f.values.get('users/buyer'), manual);
  const access = await f.load('lib/server/paypalAccess.ts').applyPayPalAccess(buyer.uid, manual);
  assert.deepEqual(Array.from(access.activeCourseIds).sort(), ['course', 'manual-course']); assert.equal(access.activePlanId, 'manual-plan');
});
test('pending captures do not activate access', async () => {
  const f = fixture(); const result = await f.service.createPayment(buyer, input); f.captureStatus = 'PENDING';
  await assert.rejects(() => f.service.capturePayment(buyer.uid, result.orderId), /PAYMENT_PENDING/);
  assert.equal(f.values.get(`purchases/${result.purchaseId}`).status, 'PENDING');
});
test('full refund removes only the PayPal grant and delayed completion cannot reactivate it', async () => {
  const f = fixture(); const result = await f.service.createPayment(buyer, input); await f.service.capturePayment(buyer.uid, result.orderId);
  f.captureStatus = 'REFUNDED'; await f.service.synchronizePayment(result.purchaseId);
  assert.equal(f.values.get(`purchases/${result.purchaseId}`).status, 'REFUNDED');
  f.captureStatus = 'COMPLETED'; await f.service.synchronizePayment(result.purchaseId);
  assert.equal(f.values.get(`purchases/${result.purchaseId}`).status, 'REFUNDED');
  const access = await f.load('lib/server/paypalAccess.ts').applyPayPalAccess(buyer.uid, { tier: 'paid', activeCourseIds: ['manual'], activePlanId: 'manual' });
  assert.deepEqual(Array.from(access.activeCourseIds), ['manual']);
});
test('refunding an earlier renewal removes its duration without deleting later purchases', () => {
  const a = { id: 'a', userId: 'buyer', courseId: 'course', planId: 'plan', durationMonths: 3, status: 'COMPLETED', verificationVersion: 3, environment: 'live', purchasedAt: '2026-01-01' };
  const b = { ...a, id: 'b', purchasedAt: '2026-02-01' };
  assert.equal(pure.paypalAccessPeriods([a, b], 'buyer')[1].accessEndsAt.slice(0, 10), '2026-07-01');
  assert.equal(pure.paypalAccessPeriods([{ ...a, status: 'REFUNDED' }, b], 'buyer')[0].accessEndsAt.slice(0, 10), '2026-05-01');
});
test('request parsing rejects non-JSON, malformed and oversized chunked payloads', async () => {
  const f = fixture(), http = f.load('lib/server/paypalPaymentHttp.ts');
  await assert.rejects(() => http.readPaymentJson(new Request('https://test', { method: 'POST', body: '{}' })), /JSON_REQUIRED/);
  for (const body of ['[]', 'null', '{']) await assert.rejects(() => http.readPaymentJson(new Request('https://test', { method: 'POST', headers: { 'content-type': 'application/json' }, body })), /INVALID_REQUEST/);
  await assert.rejects(() => http.readPaymentJson(req({ large: 'x'.repeat(100) }), 30), /REQUEST_TOO_LARGE/);
});
test('rate limits persist across requests rather than depending on a server process', async () => {
  const f = fixture(), http = f.load('lib/server/paypalPaymentHttp.ts');
  await http.limitPaymentRequests(buyer.uid, 'capture', 2); await http.limitPaymentRequests(buyer.uid, 'capture', 2);
  await assert.rejects(() => http.limitPaymentRequests(buyer.uid, 'capture', 2), /TOO_MANY_REQUESTS/);
});
test('forged webhook cannot enter the durable event inbox', async () => {
  const f = fixture(); f.api.verifyPayPalWebhook = async () => { throw new gateway.PayPalError('INVALID_WEBHOOK_SIGNATURE', 400); };
  const response = await f.load('app/api/paypal/webhook/route.ts').POST(req({ id: 'WH-123', event_type: 'PAYMENT.CAPTURE.COMPLETED' }));
  assert.equal(response.status, 400); assert.equal([...f.values.keys()].some(k => k.startsWith('paypalEvents/')), false);
});
test('authenticated events are durably stored before acknowledgement when processing needs retry', async () => {
  const f = fixture(); const response = await f.load('app/api/paypal/webhook/route.ts').POST(req({ id: 'WH-123', event_type: 'PAYMENT.CAPTURE.COMPLETED', resource: { id: 'CAPTURE123', email: 'private@example.test' } }));
  assert.equal(response.status, 200); const event = f.values.get('paypalEvents/live_WH-123');
  assert.equal(event.processed, false); assert.equal(event.lastError, 'PROCESSING_DEFERRED'); assert.equal('email' in event.resource, false);
});
test('reminder dates cannot alter payment status or another customer purchase', async () => {
  const f = fixture(), result = await f.service.createPayment(buyer, input); await f.service.capturePayment(buyer.uid, result.orderId);
  const route = f.load('app/api/paypal/reminders/route.ts');
  const response = await route.POST(req({ purchaseId: result.purchaseId, enabled: true, dates: ['2026-12-23'], timeZone: 'UTC', status: 'REFUNDED', source: 'paypal' }));
  assert.equal(response.status, 200); assert.equal(f.values.get(`purchases/${result.purchaseId}`).status, 'COMPLETED');
  assert.equal(f.values.get(`paypalReminders/${result.purchaseId}`).source, 'customer');
  f.values.get(`purchases/${result.purchaseId}`).userId = 'other';
  assert.equal((await route.POST(req({ purchaseId: result.purchaseId, enabled: false, dates: [], timeZone: 'UTC' }))).status, 404);
});
test('public purchase serialization never leaks customer contact details, internal errors or raw provider data', () => {
  const f = fixture(); const result = f.purchase.serializePurchase('p', { userEmail: 'private', userName: 'private', fingerprint: 'secret', rawPayload: {}, status: 'COMPLETED' });
  for (const name of ['userEmail', 'userName', 'fingerprint', 'rawPayload']) assert.equal(name in result, false);
});
test('unknown order creation is recovered using the original persisted provider request ID', async () => {
  const f = fixture(), create = f.api.createPayPalOrder; let failOnce = true;
  f.api.createPayPalOrder = async data => { const order = await create(data); if (failOnce) { failOnce = false; throw new gateway.PayPalError('PAYPAL_UNAVAILABLE', 503); } return order; };
  await assert.rejects(() => f.service.createPayment(buyer, input), /PAYPAL_UNAVAILABLE/);
  const record = [...f.values].find(([key]) => key.startsWith('purchases/'));
  assert.equal(record[1].status, 'CREATING');
  const recovered = await f.service.recoverPaymentOrder(record[0].split('/')[1]);
  assert.equal(recovered.orderId, 'ORDER123'); assert.equal(f.order.purchase_units[0].custom_id, recovered.purchaseId);
});
test('unknown creation beyond the idempotency window requires review and never creates another order', async () => {
  const f = fixture(), created = await f.service.createPayment(buyer, input);
  const record = f.values.get(`purchases/${created.purchaseId}`);
  Object.assign(record, { paypalOrderId: null, status: 'CREATING', createdAt: new Date(Date.now() - 6 * 3600000) });
  await assert.rejects(() => f.service.recoverPaymentOrder(created.purchaseId), /PAYMENT_REVIEW_REQUIRED/);
  assert.equal(f.calls, 1);
});
test('a verified approval webhook completes payment even if the browser never returns', async () => {
  const f = fixture(), created = await f.service.createPayment(buyer, input);
  const response = await f.load('app/api/paypal/webhook/route.ts').POST(req({ id: 'WH-APPROVAL', event_type: 'CHECKOUT.ORDER.APPROVED', resource: { id: created.orderId } }));
  assert.equal(response.status, 200); assert.equal(f.values.get(`purchases/${created.purchaseId}`).status, 'COMPLETED');
  assert.equal(f.values.get('paypalEvents/live_WH-APPROVAL').processed, true);
});
test('replayed partial refund notifications cannot increase the refund total twice', async () => {
  const f = fixture(), created = await f.service.createPayment(buyer, input); await f.service.capturePayment(buyer.uid, created.orderId);
  f.captureStatus = 'PARTIALLY_REFUNDED';
  const route = f.load('app/api/paypal/webhook/route.ts');
  for (const id of ['WH-REFUND1', 'WH-REFUND2']) {
    const result = await route.POST(req({ id, event_type: 'PAYMENT.CAPTURE.REFUNDED', resource: { id: 'REFUND123', supplementary_data: { related_ids: { order_id: created.orderId, capture_id: 'CAPTURE123' } } } }));
    assert.equal(result.status, 200);
  }
  const record = f.values.get(`purchases/${created.purchaseId}`);
  assert.equal(record.refundedMinor, 10000); assert.equal(record.status, 'COMPLETED'); assert.equal(record.refundReviewRequired, true);
  assert.equal([...f.values.keys()].filter(key => key.startsWith('paypalRefunds/')).length, 1);
});
test('disputes flag the correct purchase for review without revoking unrelated access', async () => {
  const f = fixture(), created = await f.service.createPayment(buyer, input); await f.service.capturePayment(buyer.uid, created.orderId);
  const response = await f.load('app/api/paypal/webhook/route.ts').POST(req({ id: 'WH-DISPUTE', event_type: 'CUSTOMER.DISPUTE.CREATED', resource: { id: 'DISPUTE123', status: 'OPEN', disputed_transactions: [{ seller_transaction_id: 'CAPTURE123' }] } }));
  assert.equal(response.status, 200); assert.equal(f.values.get(`purchases/${created.purchaseId}`).disputeReviewRequired, true);
  assert.equal(f.values.get(`purchases/${created.purchaseId}`).status, 'COMPLETED');
});
test('provider signature verification must explicitly return SUCCESS', async () => {
  const verify = loader({ fetch: async url => new Response(JSON.stringify(String(url).endsWith('/token')
    ? { access_token: 'test-only', expires_in: 300 } : { verification_status: 'FAILURE' }), { status: 200, headers: { 'content-type': 'application/json' } }) })('lib/server/paypalService.ts');
  const headers = new Headers({ 'paypal-auth-algo': 'SHA256withRSA', 'paypal-cert-url': 'https://api.paypal.com/v1/notifications/certs/test', 'paypal-transmission-id': 'test-id', 'paypal-transmission-sig': 'test-sig', 'paypal-transmission-time': new Date().toISOString() });
  await assert.rejects(() => verify.verifyPayPalWebhook(headers, {}), /INVALID_WEBHOOK_SIGNATURE/);
  headers.set('paypal-cert-url', 'http://169.254.169.254/credentials');
  await assert.rejects(() => verify.verifyPayPalWebhook(headers, {}), /INVALID_WEBHOOK_SIGNATURE/);
});
test('recovery endpoint refuses missing/incorrect scheduler authorization', async () => {
  const f = fixture();
  const response = await f.load('app/api/internal/paypal-reconcile/route.ts').POST(req({}));
  assert.equal(response.status, 401); assert.match(response.headers.get('cache-control'), /no-store/);
});
test('sandbox ledger records do not grant live customer access', async () => {
  const f = fixture({ 'purchases/sandbox': { id: 'sandbox', userId: buyer.uid, provider: 'paypal', verificationVersion: 3, environment: 'sandbox', status: 'COMPLETED', planId: 'plan', courseId: 'course', durationMonths: 3, purchasedAt: new Date() } });
  const access = await f.load('lib/server/paypalAccess.ts').applyPayPalAccess(buyer.uid, { tier: 'free', activeCourseIds: [] });
  assert.equal(access.tier, 'free'); assert.equal(access.paypalPlanIds.length, 0);
});
test('reversal before fulfillment creates a terminal record without ever granting access', async () => {
  const f = fixture(), created = await f.service.createPayment(buyer, input);
  f.order.status = 'COMPLETED';
  const response = await f.load('app/api/paypal/webhook/route.ts').POST(req({ id: 'WH-REVERSE', event_type: 'PAYMENT.CAPTURE.REVERSED', resource: { id: 'CAPTURE123', supplementary_data: { related_ids: { order_id: created.orderId } } } }));
  assert.equal(response.status, 200); assert.equal(f.values.get(`purchases/${created.purchaseId}`).status, 'REVERSED');
  assert.equal(f.values.has(`paypalMailOutbox/${created.purchaseId}`), false);
  await f.service.synchronizePayment(created.purchaseId);
  assert.equal(f.values.get(`purchases/${created.purchaseId}`).status, 'REVERSED');
});
test('learner payment proxy requires a bearer token and enforces body limits before forwarding', async () => {
  let calls = 0;
  const proxy = loader({ '@/lib/urologics-api': { getAuthHeader: request => request.headers.get('authorization'), getUrologicsApiUrl: value => `https://backend.test${value}` },
    fetch: async () => { calls++; return Response.json({}); },
  })(path.resolve(root, '../testing-zone/lib/paypalPaymentProxy.ts'));
  assert.equal((await proxy.forwardPayPalPayment(req({}), 'create-order')).status, 401);
  const huge = new Request('https://test', { method: 'POST', headers: { authorization: 'Bearer fixture', 'content-type': 'application/json' }, body: JSON.stringify({ large: 'x'.repeat(9000) }) });
  assert.equal((await proxy.forwardPayPalPayment(huge, 'create-order')).status, 413); assert.equal(calls, 0);
});
test('learner proxy preserves the original attempt ID, upstream failure status and private caching', async () => {
  let forwarded;
  const proxy = loader({ '@/lib/urologics-api': { getAuthHeader: request => request.headers.get('authorization'), getUrologicsApiUrl: value => `https://backend.test${value}` },
    fetch: async (url, init) => { forwarded = { url, ...init }; return Response.json({ code: 'PAYMENT_PENDING', pending: true }, { status: 409 }); },
  })(path.resolve(root, '../testing-zone/lib/paypalPaymentProxy.ts'));
  const request = new Request('https://test', { method: 'POST', headers: { authorization: 'Bearer fixture', 'content-type': 'application/json' }, body: JSON.stringify(input) });
  const result = await proxy.forwardPayPalPayment(request, 'create-order');
  assert.equal(result.status, 409); assert.equal(JSON.parse(forwarded.body).attemptId, input.attemptId);
  assert.match(result.headers.get('cache-control'), /no-store/); assert.equal(forwarded.headers.Authorization, 'Bearer fixture');
});
test('public pricing preserves catalog compatibility without exposing private coupons or waitlist data', async () => {
  const f = fixture({ 'pricingCoupons/private': { code: 'PRIVATE', isSecret: true, isActive: true },
    'pricingCoupons/public': { code: 'PUBLIC', isSecret: false, isActive: true, discountValue: 10 },
    'pricingPlanWaitlist/private': { email: 'private@example.test' },
    'pricingPlans/plan': { name: 'Plan', isActive: true, privateAdminField: 'private', eligibleCouponIds: ['private', 'public'], accessScopes: { courseIds: ['course'] },
      versions: [{ id: 'three', months: 3, price: 300, payLaterEnabled: true, couponId: 'private', apple: { secretInternal: true } }] },
  });
  const result = await f.load('lib/server/pricingService.ts').loadPublicPricingData();
  assert.equal(result.plans[0].versions[0].payLaterEnabled, true);
  assert.deepEqual(Array.from(result.plans[0].eligibleCouponIds), ['public']);
  assert.deepEqual(Array.from(result.plans[0].accessScopes.courseIds), ['course']);
  assert.equal(result.coupons.length, 1); assert.equal(result.coupons[0].code, 'PUBLIC');
  assert.equal(result.waitlistResponses.length, 0); assert.equal('privateAdminField' in result.plans[0], false);
  assert.equal('apple' in result.plans[0].versions[0], false); assert.equal(result.plans[0].versions[0].couponId, '');
});
