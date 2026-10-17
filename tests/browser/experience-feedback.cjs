// Local integration checks. API and live voice services are fully mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../../../testing-zone/node_modules/puppeteer-core');
const testing = process.env.TESTING_TEST_ORIGIN || 'http://127.0.0.1:3028';
const cms = process.env.CMS_TEST_ORIGIN || 'http://127.0.0.1:3000';
for (const origin of [testing, cms]) if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local servers only.');
const artifacts = path.resolve('.test-artifacts/experience-feedback');
const cmsFixture = path.resolve('app/ui-check-feedback/page.tsx');
const vivaFixture = path.resolve('../testing-zone/app/ui-check-feedback-viva/page.tsx');
const profile = { uid: 'feedback-candidate', name: 'Feedback Candidate', email: 'candidate@example.test', activeCourseIds: [] };
const vivaCase = { id: 'feedback-viva', case: { title: 'AI Viva feedback fixture', level: 'Intermediate', stem: 'A patient with haematuria.', objectives: [] }, exhibits: [], marking_criteria: { must_mention: [], critical_fail: [] }, viva_rules: { max_duration_minutes: 10, max_questions: 2, question_style: 'case-based', allow_candidate_request: false, examiner_tone: 'professional', progression: 'fixed' }, modes: { calmAndComposed: { enabled: true, questions: [] }, fastAndFurious: { enabled: true, questions: [] } } };

async function clickButton(page, text) {
  await page.waitForFunction(text => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === text && !button.disabled), { timeout: 30000 }, text).catch(async error => {
    console.error(`Button check failed: ${text} at ${page.url()}`, await page.$eval('body', node => node.innerText.slice(0, 5000)));
    await page.screenshot({ path: path.join(artifacts, 'button-check-failure.png'), fullPage: true });
    throw error;
  });
  await page.evaluate(text => [...document.querySelectorAll('button')].find(button => button.textContent.trim() === text).click(), text);
}

async function initialiseStudent(page, guest = false) {
  await page.evaluateOnNewDocument((profile, guest) => {
    localStorage.setItem('mockUser', JSON.stringify(profile));
    if (!guest) localStorage.setItem('urologics-testing-zone-auth', JSON.stringify({ ...profile, idToken: 'test-token', refreshToken: 'test-refresh', expiresAt: Date.now() + 3600000, tier: 'paid' }));
  }, profile, guest);
}

async function visitFixture(page, url) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
    if (response.status() === 200) return;
    // Next's dev route watcher can briefly serve its cached 404 after fixture recreation.
    await new Promise(resolve => setTimeout(resolve, 700));
  }
  throw new Error(`Temporary fixture route was not picked up: ${url}`);
}

async function mockChecks(browser) {
  for (const mode of ['submit', 'failure-skip', 'guest-skip']) {
    const context = await browser.createBrowserContext();
    try {
      const page = await context.newPage();
      await page.setViewport({ width: 1366, height: 1000 });
      await initialiseStudent(page, mode === 'guest-skip');
      const attempts = [], feedbacks = [], errors = [];
      page.on('pageerror', error => errors.push(error.message));
      await page.setRequestInterception(true);
      page.on('request', request => {
        const url = new URL(request.url());
        if (url.pathname.includes('/api/')) {
          let payload = {}, status = 200;
          if (url.pathname.endsWith('/attempts') && request.method() === 'POST') { attempts.push(JSON.parse(request.postData())); payload = { success: true }; }
          else if (url.pathname.endsWith('/experience-feedback') && request.method() === 'POST') {
            feedbacks.push(JSON.parse(request.postData()));
            status = mode === 'failure-skip' ? 503 : 200;
            payload = status === 200 ? { success: true } : { error: 'Feedback is temporarily unavailable. You can skip.' };
          } else if (url.pathname.endsWith('/mocks/feedback-fixture')) payload = { mock: { id: 'feedback-fixture', title: 'Core Urology feedback fixture', durationMinutes: 3, questions: [1, 2].map(index => ({ id: `q${index}`, questionText: `Feedback question ${index}`, options: ['Option A', 'Option B'], correctAnswer: 0 })) } };
          else if (url.pathname.endsWith('/results')) payload = { mock: { title: 'Core Urology feedback fixture' }, results: [{ rank: 1, name: profile.name, email: profile.email, marks: 2, maxMarks: 2 }] };
          else if (url.pathname.endsWith('/urologics/access')) payload = { tier: 'paid', profile };
          return request.respond({ status, contentType: 'application/json', body: JSON.stringify(payload) });
        }
        if (url.origin !== testing && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
        return request.continue();
      });
      await page.goto(`${testing}/web/mocks/feedback-fixture`, { waitUntil: 'networkidle0', timeout: 120000 });
      for (let i = 1; i <= 2; i++) {
        await page.waitForFunction(i => document.querySelector('h1')?.textContent === `Feedback question ${i}`, {}, i);
        await page.evaluate(() => [...document.querySelectorAll('section button')].find(button => button.textContent.includes('Option A')).click());
      }
      await clickButton(page, 'Submit Mock'); await clickButton(page, 'Submit');
      await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'How was your experience?', { timeout: 60000 });
      assert.equal(attempts.length, 1);
      assert.equal(await page.$('#feedback-reason'), null);
      assert.equal(await page.$eval('button[type="submit"]', button => button.disabled), true);
      if (mode !== 'guest-skip') {
        await page.click('input[name="assessment-rating"][value="2"] + span');
        await page.waitForSelector('#feedback-reason');
        await page.type('#feedback-reason', 'More clinical context would help.');
        await page.click('input[name="assessment-rating"][value="3"] + span');
        assert.equal(await page.$('#feedback-reason'), null);
        await page.click('input[name="assessment-rating"][value="2"] + span');
        await page.click('input[name="app-rating"][value="4"] + span');
        if (mode === 'submit') {
          await page.screenshot({ path: path.join(artifacts, 'mock-feedback-desktop.png'), fullPage: true });
          await page.setViewport({ width: 390, height: 844 });
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
          await page.screenshot({ path: path.join(artifacts, 'mock-feedback-mobile.png'), fullPage: true });
        }
        await clickButton(page, 'Submit & view rankings');
        if (mode === 'failure-skip') {
          await page.waitForSelector('[role="alert"]');
          assert.match(await page.$eval('body', node => node.innerText), /temporarily unavailable/);
          await clickButton(page, 'Skip to rankings');
        }
      } else await clickButton(page, 'Skip to rankings');
      await page.waitForFunction(() => location.pathname.endsWith('/rank'), { timeout: 60000 });
      assert.equal(attempts.length, 1, 'Feedback cannot submit a second mock attempt');
      assert.equal(feedbacks.length, mode === 'guest-skip' ? 0 : 1);
      if (feedbacks.length) {
        assert.equal(feedbacks[0].questionsRating, 2); assert.equal(feedbacks[0].appRating, 4);
        assert.equal(feedbacks[0].reason, 'More clinical context would help.');
      }
      assert.deepEqual(errors, []);
      console.log(`Mock browser passed: ${mode}`);
    } finally { await context.close(); }
  }
}

async function vivaChecks(browser) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const diagnostics = [];
  page.on('console', message => diagnostics.push(message.text().slice(0, 400)));
  try {
    await page.setViewport({ width: 1366, height: 1000 });
    await initialiseStudent(page);
    await page.evaluateOnNewDocument(() => {
      window.__feedbackSockets = [];
      class TestSocket extends EventTarget {
        static CONNECTING = 0; static OPEN = 1; static CLOSED = 3;
        readyState = 0;
        constructor(url) {
          super(); this.url = String(url); window.__feedbackSockets.push(this);
          setTimeout(() => { this.readyState = 1; const event = new Event('open'); this.onopen?.(event); this.dispatchEvent(event); }, 5);
        }
        send(data) {
          if (typeof data !== 'string') return;
          const body = JSON.parse(data);
          if (body.case) setTimeout(() => this.emit({ type: 'session_ready' }), 5);
          if (body.type === 'text') setTimeout(() => this.emit({ outputTranscription: { text: 'What is your initial assessment?' }, turnComplete: true }), 5);
        }
        emit(body) { this.onmessage?.({ data: JSON.stringify(body) }); }
        close(code = 1000, reason = '') {
          if (this.readyState === 3) return;
          this.readyState = 3;
          const event = new CloseEvent('close', { code, reason, wasClean: true });
          this.onclose?.(event); this.dispatchEvent(event);
        }
      }
      window.WebSocket = TestSocket;
    });
    let reports = 0, feedbacks = 0;
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) {
        let payload = {}, status = 200;
        if (url.pathname.endsWith('/urologics/access')) payload = { tier: 'paid', profile };
        else if (url.pathname.endsWith('/experience-feedback')) { feedbacks++; payload = { success: true }; }
        else if (url.pathname.endsWith('/generateScore')) { reports++; status = 503; payload = { error: 'Simulated report outage' }; }
        return request.respond({ status, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (url.origin !== testing && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await visitFixture(page, `${testing}/web/ui-check-feedback-viva`);
    await clickButton(page, 'Continue');
    await clickButton(page, 'Test speaker');
    await clickButton(page, 'I heard it');
    await page.waitForFunction(() => [...document.querySelectorAll('button')].some(button => button.textContent.trim() === 'Start Viva Session' && !button.classList.contains('opacity-40')), { timeout: 30000 });
    await clickButton(page, 'Start Viva Session');
    await page.waitForSelector('[aria-label="End viva"]', { timeout: 60000 });
    await page.waitForFunction(() => !document.body.innerText.includes('Start Viva Session') && window.__feedbackSockets.some(socket => socket.url.includes('/ws/') && socket.readyState === 1), { timeout: 60000 });
    await page.evaluate(() => window.__feedbackSockets.find(socket => socket.url.includes('/ws/')).emit({ type: 'session_end', reason: 'candidate_confirmed_early_exit' }));
    await page.waitForFunction(() => document.querySelector('h1')?.textContent === 'How was your experience?', { timeout: 30000 });
    assert.equal(reports, 0, 'Report generation must wait for feedback or Skip');
    assert.equal(await page.evaluate(() => window.__feedbackSockets.find(socket => socket.url.includes('/ws/')).readyState), 3, 'Live session closes before feedback');
    assert.ok(await page.$('#feedback-comment'));
    assert.equal(await page.$$eval('fieldset', fields => fields.length), 1);
    await page.screenshot({ path: path.join(artifacts, 'viva-feedback-desktop.png'), fullPage: true });
    await page.click('input[name="assessment-rating"][value="5"] + span');
    await page.type('#feedback-comment', 'Useful viva practice.');
    await clickButton(page, 'Submit & generate report');
    await page.waitForFunction(() => document.body.innerText.includes('Your report could not be generated'), { timeout: 30000 });
    assert.equal(reports, 1); assert.equal(feedbacks, 1);
    const retried = page.waitForResponse(response => response.url().endsWith('/generateScore'));
    await clickButton(page, 'Retry report');
    await retried;
    await page.waitForFunction(() => document.body.innerText.includes('Your report could not be generated'), { timeout: 30000 });
    assert.equal(reports, 2, 'Report retry continues without asking for feedback again');
    assert.equal(feedbacks, 1);
    assert.deepEqual(errors, []);
    console.log('Viva browser passed: socket closed, feedback before scoring, submit continues, report retry skips repeated feedback.');
  } catch (error) {
    console.error('Viva diagnostic:', await page.$eval('body', node => node.innerText.slice(0, 5000)), diagnostics.slice(-20));
    await page.screenshot({ path: path.join(artifacts, 'viva-check-failure.png'), fullPage: true });
    throw error;
  } finally { await context.close(); }
}

async function cmsChecks(browser) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  const diagnostics = [];
  page.on('console', message => diagnostics.push(message.text().slice(0, 400)));
  try {
    await page.setViewport({ width: 1366, height: 1000 });
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: profile.uid, user_id: profile.uid, email: profile.email, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600, firebase: { sign_in_provider: 'custom' } })).toString('base64url'), 'fixture'].join('.');
    const filters = [{ key: 'all', label: 'All reviews from API', count: 3 }, { key: 'mock', label: 'Mock reviews from API', count: 1 }, { key: 'viva', label: 'Viva reviews from API', count: 1 }, { key: 'webapp', label: 'Webapp reviews from API', count: 0 }, { key: 'app', label: 'Mobile reviews from API', count: 1 }];
    const rows = ['mock', 'viva', 'app'].map((category, i) => ({ id: `${i}`, category, categoryLabel: filters.find(filter => filter.key === category).label, kind: category === 'app' ? 'webapp' : category, platform: category === 'app' ? 'mobile' : 'web', contextTitle: category === 'mock' ? 'Core Urology Mock' : category === 'viva' ? 'Haematuria AI Viva' : null, candidate: profile, submittedAt: '2026-10-17T10:00:00.000Z', ratings: category === 'mock' ? [{ key: 'questions', label: 'Questions', value: 2 }, { key: 'appExperience', label: 'App experience', value: 4 }] : [{ key: 'overall', label: 'Overall experience', value: 5 }], reason: category === 'mock' ? 'More clinical context please.' : null, comment: category === 'viva' ? 'Helpful examiner.' : null }));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      const respond = body => request.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, body: JSON.stringify(body) });
      if (url.hostname === 'identitytoolkit.googleapis.com') {
        if (url.pathname.endsWith('accounts:signInWithCustomToken')) return respond({ localId: profile.uid, idToken: token, refreshToken: 'fixture-refresh', expiresIn: '3600', isNewUser: false });
        return respond({ users: [{ localId: profile.uid, email: profile.email, displayName: profile.name }] });
      }
      if (url.pathname.includes('/api/')) {
        if (url.pathname.endsWith('/experience-feedback')) {
          const category = url.searchParams.get('category');
          return respond({ filters, items: category === 'all' ? url.searchParams.has('cursor') ? [rows[2]] : rows.slice(0, 2) : rows.filter(row => row.category === category), nextCursor: category === 'all' && !url.searchParams.has('cursor') ? 'next-page' : null });
        }
        return respond({ success: true, isAdmin: true, tier: 'paid', profile });
      }
      if (url.origin !== cms && !['data:', 'blob:'].includes(url.protocol)) return request.abort();
      return request.continue();
    });
    await visitFixture(page, `${cms}/ui-check-feedback`);
    await page.waitForSelector('article', { timeout: 60000 });
    assert.equal(await page.$$eval('article', nodes => nodes.length), 2);
    assert.match(await page.$eval('nav', node => node.innerText), /Viva reviews from API/);
    await clickButton(page, 'Load more feedback');
    await page.waitForFunction(() => document.querySelectorAll('article').length === 3);
    await page.screenshot({ path: path.join(artifacts, 'cms-feedback-desktop.png'), fullPage: true });
    await page.evaluate(() => [...document.querySelectorAll('nav button')].find(button => button.textContent.includes('Viva reviews from API')).click());
    await page.waitForFunction(() => document.querySelectorAll('article').length === 1 && document.querySelector('article')?.innerText.includes('Helpful examiner.'));
    await page.evaluate(() => [...document.querySelectorAll('nav button')].find(button => button.textContent.includes('Webapp reviews from API')).click());
    await page.waitForFunction(() => document.body.innerText.includes('No feedback yet'));
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(artifacts, 'cms-feedback-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    console.log('CMS browser passed: backend labels/counts, both mock ratings, Load more, category filtering and empty state.');
  } catch (error) {
    console.error('CMS diagnostic:', page.url(), await page.$eval('body', node => node.innerText.slice(0, 5000)), diagnostics.slice(-15));
    await page.screenshot({ path: path.join(artifacts, 'cms-check-failure.png'), fullPage: true });
    throw error;
  } finally { await context.close(); }
}

(async () => {
  if (fs.existsSync(cmsFixture) || fs.existsSync(vivaFixture)) throw new Error('Fixture route already exists; refusing to overwrite it.');
  fs.mkdirSync(artifacts, { recursive: true });
  const microphoneFile = path.join(artifacts, 'microphone.wav');
  const samples = 16000, wav = Buffer.alloc(44 + samples * 2);
  wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
  wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
  wav.writeUInt32LE(16000, 24); wav.writeUInt32LE(32000, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
  wav.write('data', 36); wav.writeUInt32LE(samples * 2, 40);
  for (let i = 0; i < samples; i++) wav.writeInt16LE(Math.round(Math.sin(i / 16000 * Math.PI * 440 * 2) * 5000), 44 + i * 2);
  fs.writeFileSync(microphoneFile, wav);
  fs.mkdirSync(path.dirname(cmsFixture), { recursive: true });
  fs.mkdirSync(path.dirname(vivaFixture), { recursive: true });
  fs.writeFileSync(cmsFixture, `"use client";\nimport {useEffect,useState} from 'react';\nimport {signInWithCustomToken} from 'firebase/auth';\nimport {auth} from '@/lib/firebaseClient';\nimport FeedbackInbox from '@/components/dashboard/FeedbackInbox';\nexport default function Fixture(){const[ready,setReady]=useState(false);useEffect(()=>{void signInWithCustomToken(auth,'fixture-token').then(()=>setReady(true));},[]);return ready?<main className="mx-auto max-w-6xl p-6"><FeedbackInbox/></main>:<p>Preparing fixture…</p>;}`);
  fs.writeFileSync(vivaFixture, `"use client";\nimport VivaVoiceAi from '@/components/ai-viva/VivaVoiceAi';\nimport type {VivaCaseRecord} from '@/lib/viva-case';\nexport default function Fixture(){return <VivaVoiceAi vivaCase={${JSON.stringify(vivaCase)} as unknown as VivaCaseRecord} initialCandidate={${JSON.stringify({ name: profile.name, email: profile.email })}}/>;}`);
  let browser;
  try {
    const executablePath = process.env.CHROME_PATH || ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
    browser = await puppeteer.launch({ executablePath, headless: true, pipe: true, args: ['--no-sandbox', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${microphoneFile}`, '--autoplay-policy=no-user-gesture-required'], timeout: 60000 });
    const scopes = (process.env.FEEDBACK_TEST_SCOPE || 'mock,viva,cms').split(',');
    if (scopes.includes('mock')) await mockChecks(browser);
    if (scopes.includes('viva')) await vivaChecks(browser);
    if (scopes.includes('cms')) await cmsChecks(browser);
  } finally {
    await browser?.close();
    fs.rmSync(cmsFixture); fs.rmdirSync(path.dirname(cmsFixture));
    fs.rmSync(vivaFixture); fs.rmdirSync(path.dirname(vivaFixture));
    // Next keeps generated route types after a temporary route is removed.
    for (const generated of [
      path.resolve('.next/dev/types/app/ui-check-feedback/page.ts'),
      path.resolve('../testing-zone/.next/dev/types/app/ui-check-feedback-viva/page.ts'),
    ]) if (fs.existsSync(generated)) fs.rmSync(generated);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
