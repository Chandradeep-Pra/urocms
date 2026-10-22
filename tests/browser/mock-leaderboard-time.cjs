const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../../../testing-zone/node_modules/puppeteer-core');

const origin = process.env.MOCK_ORIGIN || 'http://127.0.0.1:3028';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local test origin required');

(async () => {
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, pipe: true, timeout: 30000 });
  const artifacts = path.resolve('.test-artifacts/leaderboard-time');
  fs.mkdirSync(artifacts, { recursive: true });
  const results = [
    { email: 'james@example.test', name: 'James Walker', marks: 17, timeTakenSeconds: 780, submittedAt: '2026-10-21T08:00:00Z' },
    { email: 'noah@example.test', name: 'Noah Patel', marks: 17, timeTakenSeconds: null, submittedAt: '2026-10-21T07:00:00Z' },
    { email: 'maya@example.test', name: 'Maya Shah', marks: 17, timeTakenSeconds: 625, submittedAt: '2026-10-21T09:00:00Z' },
    { email: 'olivia@example.test', name: 'Olivia Reed', marks: 18, timeTakenSeconds: 930, submittedAt: '2026-10-21T10:00:00Z' },
  ].map(row => ({ ...row, maxMarks: 20 }));
  const errors = [], writes = [];
  let scenario = 'normal';
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.evaluateOnNewDocument(() => {
      localStorage.setItem('urologics-testing-zone-auth', JSON.stringify({ uid: 'maya', email: 'maya@example.test', name: 'Maya Shah', idToken: 'fixture', refreshToken: 'fixture', expiresAt: Date.now() + 3600000, tier: 'paid', activeCourseIds: [] }));
    });
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) {
        if (!['GET', 'HEAD'].includes(request.method()) && /\/(attempts|start)$/.test(url.pathname)) writes.push(url.pathname);
        let payload = {};
        if (url.pathname.endsWith('/results')) payload = { mock: { title: 'FRCS Urology · Clinical Mock' }, results: scenario === 'empty' ? [] : results };
        else if (url.pathname.endsWith('/mocks/time-fixture')) payload = { mock: { id: 'time-fixture', title: 'FRCS Urology · Clinical Mock', accessType: 'public', durationMinutes: 20, questions: [], hasAttempted: scenario !== 'empty', ...(scenario !== 'empty' ? { userAttempt: { marks: 17, totalQuestions: 20, submittedAt: '2026-10-21T09:00:00Z', timeTakenSeconds: 625 } } : {}) } };
        else if (url.pathname.endsWith('/urologics/access')) payload = { tier: 'paid', profile: { uid: 'maya', email: 'maya@example.test', name: 'Maya Shah', activeCourseIds: [] } };
        return request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(payload) });
      }
      if (!['localhost', '127.0.0.1'].includes(url.hostname) && !url.protocol.startsWith('data')) return request.abort();
      return request.continue();
    });
    await page.setViewport({ width: 1440, height: 1000 });
    await page.goto(`${origin}/web/mocks/time-fixture/rank?from=mocks`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('table tbody tr', { timeout: 60000 });
    const names = await page.$$eval('table tbody tr td:nth-child(2) p[title]', nodes => nodes.map(node => node.textContent));
    assert.deepEqual(names, ['Olivia Reed', 'Maya Shah', 'James Walker', 'Noah Patel']);
    assert.match(await page.$eval('#your-rank', node => node.innerText), /#2/);
    assert.match(await page.$eval('#your-rank', node => node.innerText), /10m 25s/);
    assert.match(await page.$eval('table tbody tr:nth-child(2) td:last-child', node => node.innerText), /10m 25s/);
    assert.match(await page.$eval('table tbody tr:last-child td:last-child', node => node.innerText), /Not recorded/);
    assert.equal(await page.$$eval('[aria-label="Top three candidates"] [aria-label^="Time taken:"]', nodes => nodes.length), 3);
    assert.equal(writes.length, 0, 'Viewing a leaderboard never submits attempts');
    await page.screenshot({ path: path.join(artifacts, 'desktop-light.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.add('dark'));
    await new Promise(resolve => setTimeout(resolve, 300));
    await page.screenshot({ path: path.join(artifacts, 'desktop-dark.png'), fullPage: true });
    for (const width of [320, 390, 768]) {
      await page.setViewport({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No overflow at ${width}px`);
      assert.equal(await page.$eval('table tbody tr:nth-child(2) td:last-child', node => node.scrollWidth > node.clientWidth), false, `Time fits at ${width}px`);
    }
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(artifacts, 'mobile-dark.png'), fullPage: true });
    await page.evaluate(() => document.documentElement.classList.remove('dark'));
    await new Promise(resolve => setTimeout(resolve, 300));
    await page.screenshot({ path: path.join(artifacts, 'mobile-light.png'), fullPage: true });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.focus('header a[href="#your-rank"]');
    await page.keyboard.press('Enter');
    assert.ok(await page.$eval('#your-rank', node => node.getBoundingClientRect().top < innerHeight));
    scenario = 'empty';
    await page.goto(`${origin}/web/mocks/time-fixture/rank?from=mocks`, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => document.querySelector('table tbody')?.textContent.includes('No attempts yet.'));
    assert.equal(await page.$('[aria-label="Top three candidates"]'), null);
    assert.deepEqual(errors, []);
    console.log('Leaderboard browser passed: faster-time tie order, personal card, podium and row times, unknown time, 320/390/768px, light/dark, keyboard, reduced motion, empty state and no writes.');
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
