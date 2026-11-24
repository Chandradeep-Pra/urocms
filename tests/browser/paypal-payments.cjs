/* Browser fixtures never contact PayPal, Firebase or a real database. */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../../../testing-zone/node_modules/puppeteer-core');
const cms = process.env.PAYPAL_CMS_TEST_ORIGIN || 'http://localhost:3035';
const learner = process.env.PAYPAL_LEARNER_TEST_ORIGIN || 'http://localhost:3036';
for (const value of [cms, learner]) if (!['localhost', '127.0.0.1'].includes(new URL(value).hostname)) throw Error('Local origins only');
const artifacts = path.resolve('.test-artifacts/paypal-browser');
const sdk = `window.paypal = {
  FUNDING: { PAYPAL: 'paypal', PAYLATER: 'paylater', CARD: 'card' },
  Buttons(options) { let button; return { isEligible: () => window.paypalFixtureEligibility[options.fundingSource] !== false, async render(element) {
    if (window.paypalFixtureEligibility[options.fundingSource] === false) throw Error('Ineligible funding source rendered');
    button = document.createElement('button'); button.type = 'button'; button.dataset.paypalTest = options.fundingSource;
    button.textContent = options.fundingSource === 'paylater' ? 'PayPal Pay Later - test fixture' : options.fundingSource === 'card' ? 'Debit or Credit Card - test fixture' : 'PayPal - test fixture';
    button.style.cssText = 'width:100%;height:48px;border-radius:24px;background:#ffc439;color:#003087;font-weight:700;cursor:pointer';
    button.onclick = async () => { try { const id = await options.createOrder({ fundingSource: options.fundingSource }); await options.onApprove({ orderID: id }); } catch (error) { options.onError(error); } };
    element.appendChild(button);
  }, async close() { button?.remove(); } }; },
  Messages() { return { async render(element) { element.textContent = 'Pay in 3 interest-free payments. Subject to status and approval. Test fixture.'; } }; }
};`;

(async () => {
  fs.mkdirSync(artifacts, { recursive: true });
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true, args: ['--no-sandbox'], timeout: 60000 });
  const errors = [], writes = [], creates = []; let captures = 0;
  let fundingEligibility = { card: true, paylater: true };
  const profile = { uid: 'paypal-fixture', email: 'candidate@example.test', name: 'Test Candidate', country: 'United Kingdom', phone: '+447700900123', medicalInstitution: 'Test Hospital', activeCourseIds: ['course'], activePlanStatus: 'active' };
  const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: profile.uid, user_id: profile.uid, email: profile.email, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600, auth_time: Math.floor(Date.now()/1000), firebase: { sign_in_provider: 'password' } })).toString('base64url'), 'fixture'].join('.');
  const date = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);
  let reminder = { enabled: true, dates: [date], timeZone: 'Europe/London', source: 'customer', dismissedDates: [] };
  try {
    const page = await browser.newPage(); page.setDefaultTimeout(30000);
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      const json = (body, status = 200) => request.respond({ status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, body: JSON.stringify(body) });
      if (url.hostname === 'www.paypal.com' && url.pathname === '/sdk/js') {
        assert.ok(url.searchParams.get('components').split(',').includes('funding-eligibility'));
        return request.respond({ status: 200, contentType: 'application/javascript', body: `window.paypalFixtureEligibility = ${JSON.stringify(fundingEligibility)};\n${sdk}` });
      }
      if (url.hostname === 'identitytoolkit.googleapis.com') {
        if (url.pathname.endsWith('accounts:signInWithPassword')) return json({ localId: profile.uid, email: profile.email, displayName: profile.name, idToken: token, refreshToken: 'fixture-refresh', expiresIn: '3600', registered: true });
        if (url.pathname.endsWith('accounts:lookup')) return json({ users: [{ localId: profile.uid, email: profile.email, displayName: profile.name, providerUserInfo: [{ providerId: 'password', email: profile.email, rawId: profile.email }] }] });
        return json({});
      }
      if (url.pathname.includes('/api/')) {
        if (url.pathname.includes('/auth/role')) return json({ isAdmin: false, destination: '/checkout?planId=plan&versionId=three', studentDestination: '/checkout?planId=plan&versionId=three' });
        if (url.pathname.endsWith('/access')) return json({ tier: 'paid', profile });
        if (url.pathname.endsWith('/dial-codes')) return json({ countries: [{ label: 'United Kingdom (+44)', value: 'United Kingdom-+44' }] });
        if (url.pathname === '/api/app/checkout' || url.pathname.endsWith('/api/checkout')) return json({ purchaseAvailable: true, plan: { id: 'plan', courseId: 'course', name: 'Urologics Core', description: 'Complete course access' }, version: { id: 'three', months: 3, durationLabel: '3 months', currency: 'GBP', originalPrice: 300 }, coupons: [], taxPercent: 0, paypalClientId: 'fixture', paypal: { enabled: true, environment: 'sandbox', payLaterEnabled: true }, user: profile });
        if (url.pathname.endsWith('/api/paypal/quote')) return json({ total: 300, taxAmount: 0, originalAmount: 300, discountAmount: 0, amountMinor: 30000, currency: 'GBP', payLaterEligible: true });
        if (url.pathname.endsWith('/api/paypal/create-order')) { creates.push(JSON.parse(request.postData())); return json({ orderId: 'ORDER123', purchaseId: 'purchase123' }); }
        if (url.pathname.endsWith('/api/paypal/capture-order')) { captures++; return captures === 1 ? json({ error: 'Verification pending', code: 'PAYMENT_UNAVAILABLE', pending: true }, 503) : json({ success: true, purchaseId: 'purchase123' }); }
        if (url.pathname.endsWith('/paypal/reminders')) {
          if (request.method() === 'POST') { const body = JSON.parse(request.postData()); writes.push(body); reminder = { ...body, source: 'customer' }; return json({ reminder, upcoming: reminder.enabled && !reminder.dismissedDates.includes(date) ? [{ date, days: 3 }] : [] }); }
          return json({ items: [{ purchaseId: 'purchase123', planName: 'Urologics Core', reminder, upcoming: reminder.enabled && !reminder.dismissedDates.includes(date) ? [{ date, days: 3 }] : [] }] });
        }
        if (url.pathname.endsWith('/announcements')) return json({ announcements: [] });
        if (url.pathname.endsWith('/daily-quiz')) return json({ quiz: null });
        if (url.pathname.endsWith('/exam-schedules')) return json({ schedules: [] });
        if (url.pathname.endsWith('/video-progress')) return json({ entries: [] });
        if (url.pathname.endsWith('/viva-cases')) return json({ cases: [] });
        if (url.pathname.endsWith('/mocks')) return json({ mocks: [] });
        return json({ success: true });
      }
      if (!['127.0.0.1', 'localhost'].includes(url.hostname)) return request.abort();
      return request.continue();
    });
    await page.setViewport({ width: 1280, height: 1000 });
    await page.goto(`${cms}/login?redirect=${encodeURIComponent('/checkout?planId=plan&versionId=three')}`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('[aria-label="Show password"]');
    await page.click('[aria-label="Show password"]');
    await page.waitForFunction(() => document.querySelector('#login-password')?.type === 'text');
    await page.click('[aria-label="Hide password"]');
    if (!await page.$('#login-email')) await page.$$eval('button', buttons => buttons.find(b => b.textContent.trim() === 'Sign in')?.click());
    await page.type('#login-email', profile.email); await page.type('#login-password', 'fixture-password'); await page.click('button[type="submit"]');
    await page.waitForFunction(() => document.body.innerText.includes('Welcome back')).catch(async error => { console.log('Sign-in fixture diagnostic:', await page.$eval('body', node => node.innerText)); console.log('Browser errors:', errors); throw error; });
    await page.waitForFunction(() => location.pathname === '/checkout', { timeout: 120000 });
    await page.waitForSelector('[data-paypal-test="paylater"]', { timeout: 120000 });
    await page.waitForSelector('[data-paypal-test="card"]');
    await page.screenshot({ path: path.join(artifacts, 'checkout-desktop.png'), fullPage: true });
    await page.setViewport({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts, 'checkout-mobile.png'), fullPage: true });
    await page.click('[data-paypal-test="paylater"]');
    await page.waitForFunction(() => document.body.innerText.includes('Check this payment'));
    assert.equal(creates.length, 1); assert.equal(creates[0].checkoutIntent, 'paylater'); assert.ok(creates[0].attemptId.length >= 20);
    await page.$$eval('button', buttons => buttons.find(b => b.textContent === 'Check this payment').click());
    await page.waitForFunction(() => document.body.innerText.includes('Thank you for your purchase!'));
    assert.equal(creates.length, 1, 'Checking a pending payment must not create a new order');
    await page.$$eval('button', buttons => buttons.find(b => b.textContent === 'Set my reminder dates').click());
    await page.$eval('input[type="date"]', (input, value) => { const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set; setter.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); input.dispatchEvent(new Event('change', { bubbles: true })); }, date);
    await page.$$eval('button', buttons => buttons.find(b => b.textContent === 'Save reminder dates').click());
    await page.waitForFunction(() => document.body.innerText.includes('Your reminder dates are saved.'));
    assert.equal(writes.length, 1);
    await page.screenshot({ path: path.join(artifacts, 'checkout-success.png'), fullPage: true });
    const candidate = { ...profile, idToken: token, refreshToken: 'fixture-refresh', expiresAt: Date.now() + 3600000, tier: 'paid' };
    await page.evaluateOnNewDocument(candidate => { localStorage.setItem('urologics-testing-zone-auth', JSON.stringify(candidate)); localStorage.setItem('urologics-testing-zone-theme', 'light'); }, candidate);
    await page.goto(`${learner}/web`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('.overview-paypal-due', { timeout: 120000 });
    assert.match(await page.$eval('.overview-paypal-due', node => node.innerText), /in 3 days/);
    for (const width of [1280, 390]) {
      await page.setViewport({ width, height: 950 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
      await page.screenshot({ path: path.join(artifacts, `overview-${width}.png`), fullPage: true });
    }
    await page.click('.overview-paypal-due button');
    await page.waitForFunction(() => !document.querySelector('.overview-paypal-due'));
    assert.deepEqual(writes.at(-1).dismissedDates, [date]);
    captures = 0;
    await page.goto(`${learner}/web/checkout?planId=plan&versionId=three`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('[data-paypal-test="paylater"]');
    await page.waitForSelector('[data-paypal-test="card"]');
    await page.screenshot({ path: path.join(artifacts, 'learner-checkout-mobile.png'), fullPage: true });
    await page.click('[data-paypal-test="paylater"]');
    await page.waitForFunction(() => document.body.innerText.includes('Check this payment'));
    assert.equal(creates.length, 2); assert.equal(creates[1].checkoutIntent, 'paylater');
    await page.$$eval('button', buttons => buttons.find(b => b.textContent === 'Check this payment').click());
    await page.waitForFunction(() => document.body.innerText.includes('Thank you for your purchase!'));
    assert.equal(creates.length, 2);
    for (const [app, checkout] of [
      ['cms', `${cms}/checkout?planId=plan&versionId=three`],
      ['learner', `${learner}/web/checkout?planId=plan&versionId=three`],
    ]) {
      for (const eligibility of [
        { card: true, paylater: false },
        { card: false, paylater: true },
        { card: false, paylater: false },
      ]) {
        fundingEligibility = eligibility;
        await page.goto(checkout, { waitUntil: 'networkidle0', timeout: 120000 });
        await page.waitForSelector('[data-paypal-test="paypal"]');
        if (eligibility.card) await page.waitForSelector('[data-paypal-test="card"]');
        if (eligibility.paylater) await page.waitForSelector('[data-paypal-test="paylater"]');
        assert.equal(Boolean(await page.$('[data-paypal-test="card"]')), eligibility.card, `${app}: card eligibility`);
        assert.equal(Boolean(await page.$('[data-paypal-test="paylater"]')), eligibility.paylater, `${app}: Pay Later eligibility`);
        assert.equal(await page.$eval('#paypal-paylater-button', element => element.closest('section').hidden), !eligibility.paylater);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
        if (eligibility.card) {
          assert.equal(await page.evaluate(() => document.querySelector('[data-paypal-test="card"]').getBoundingClientRect().top >= document.querySelector('[data-paypal-test="paypal"]').getBoundingClientRect().bottom), true, 'Card button appears below PayPal');
          await page.screenshot({ path: path.join(artifacts, `${app}-card-without-paylater.png`), fullPage: true });
          const previousCreates = creates.length;
          captures = 0;
          await page.click('[data-paypal-test="card"]');
          await page.waitForFunction(() => document.body.innerText.includes('Check this payment'));
          assert.equal(creates.length, previousCreates + 1);
          assert.equal(creates.at(-1).checkoutIntent, 'paypal', 'Card uses the existing PayPal payment contract');
          assert.ok(creates.at(-1).attemptId.length >= 20);
          await page.$$eval('button', buttons => buttons.find(b => b.textContent === 'Check this payment').click());
          await page.waitForFunction(() => document.body.innerText.includes('Thank you for your purchase!'));
          assert.equal(creates.length, previousCreates + 1, 'Card recovery must reuse the existing order');
          assert.equal(captures, 2);
        }
      }
    }
    assert.deepEqual(errors, []);
    console.log(JSON.stringify({ cardAndPayLaterEligibility: 'passed in both apps', cardOrderAndRecovery: 'passed in both apps', checkoutRetry: 'passed', reminderSaveAndDismiss: 'passed', mobileOverflow: 'none', browserErrors: errors.length, screenshots: artifacts }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
