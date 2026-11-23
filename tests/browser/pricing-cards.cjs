const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../../../testing-zone/node_modules/puppeteer-core');

const cms = process.env.CMS_TEST_ORIGIN || 'http://localhost:3000';
const testing = process.env.TESTING_TEST_ORIGIN || 'http://localhost:3022';
for (const origin of [cms, testing]) {
  if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local test origins only');
}
const artifacts = path.resolve('.test-artifacts/pricing-shared-height');
const fixturePath = path.resolve('app/pricing-preview-local/page.tsx');
const features = ['Chapter-wise Tests', 'Full recordings access', 'Detailed answers and explanations', 'Live lectures and viva practice', 'Group sessions with feedback after each case', 'Dedicated Whatsap group for doubt solving', 'AI mock practice', 'Discussion of previous exam scenarios'];
const version = (id, months, price) => ({ id, months, price, durationLabel: `${months} Months`, billingLabel: '£115/month' });
const plans = ['CORE SBA', 'ELITE SBA', 'AI Viva', 'Coming Soon'].map((name, index) => ({
  id: `plan-${index}`, name: `Urologics ${name}`, category: 'FRCS Urology Section 1', tag: index === 1 ? 'Popular' : '',
  description: 'Structured preparation with timed tests and detailed explanations.', subtitle: 'Structured preparation with timed tests and detailed explanations.',
  featureBullets: [...features.slice(0, [2, 8, 5, 3][index]).map(text => `✔ ${text}`), `✓ ${features[0]}`],
  isActive: index < 3, price: 690, expiryMonths: 6, versions: [version('six', 6, 690), version('twelve', 12, 999)],
  eligibleCoupons: index === 0 ? [{ id: 'coupon', code: 'SAVE10', description: 'Save ten percent', discountType: 'percent', discountValue: 10 }] : [],
  courseItems: index < 2 ? [{ id: `course-${index}`, title: index === 0 ? features[0] : `Linked course ${index + 1}`, sectionsCount: index === 0 ? 0 : 3, accessTier: 'free', showOnApp: true }] : [],
  items: [], vivaMinutes: index === 2 ? 500 : 0, sortOrder: index,
}));
const groups = [{ category: 'FRCS Urology Section 1', categorySortOrder: 0, plans: plans.map(({ description, sortOrder, ...plan }) => plan) }];
const fixture = `import { PricingCategoryAccordion } from '@/components/pricing/PricingCategoryAccordion';
export default function Preview() {return <main className="min-h-screen bg-cyan-50 px-3 py-10 sm:px-6 lg:px-8"><div className="mx-auto max-w-[1400px]"><h1 className="mb-10 text-4xl font-semibold">Urologics FRCS Plans</h1><PricingCategoryAccordion groupedPlans={${JSON.stringify(groups)}} /></div></main>;}`;

async function settle(page) {
  await page.waitForFunction(() => {
    const grid = document.querySelector('[data-pricing-grid]');
    const height = Number(grid?.getAttribute('data-card-height'));
    return height > 0 && [...grid.querySelectorAll('[data-pricing-card]')].every(card => {
      const list = card.querySelector('[data-pricing-features]');
      const overflowing = list.scrollHeight > list.clientHeight + 1;
      return Math.abs(card.getBoundingClientRect().height - height) < 1 && overflowing === Boolean(card.querySelector('[data-check-all]'));
    });
  });
}

async function checkControls(page) {
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  const cards = await page.$$eval('[data-pricing-card]', nodes => nodes.map(card => {
    const box = card.getBoundingClientRect();
    const footer = card.querySelector('[data-pricing-footer]').getBoundingClientRect();
    const list = card.querySelector('[data-pricing-features]');
    const actions = card.querySelector('[data-pricing-actions]');
    const content = list.firstElementChild;
    const labels = [...content.children].map(node => node.textContent.trim());
    return { height: box.height, footerFits: footer.bottom <= box.bottom + 1, footerVisible: footer.height > 0,
      scrollbar: getComputedStyle(list).scrollbarWidth, webkitScrollbar: getComputedStyle(list, '::-webkit-scrollbar').display,
      paddingTop: getComputedStyle(card).paddingTop, paddingBottom: getComputedStyle(card).paddingBottom,
      listGap: getComputedStyle(list.parentElement).marginTop, footerGap: getComputedStyle(card.querySelector('[data-pricing-footer]')).marginTop,
      actionHeight: actions.getBoundingClientRect().height,
      firstBulletPadding: getComputedStyle(content.firstElementChild).paddingBottom,
      bulletGap: content.children.length > 1 ? content.children[1].getBoundingClientRect().top - content.children[0].getBoundingClientRect().bottom : 8,
      labels };
  }));
  assert.ok(Math.max(...cards.map(card => card.height)) - Math.min(...cards.map(card => card.height)) < 1);
  assert.ok(cards.every(card => card.footerFits && card.footerVisible));
  assert.ok(cards.every(card => card.scrollbar === 'none' && card.webkitScrollbar === 'none'));
  const padding = (await page.viewport()).width >= 640 ? '20px' : '16px';
  assert.ok(cards.every(card => card.paddingTop === padding && card.paddingBottom === padding));
  assert.ok(cards.every(card => card.listGap === '12px' && card.footerGap === '8px'));
  assert.ok(cards.every(card => card.firstBulletPadding === '8px' && card.bulletGap === 8));
  const hasActions = (await page.$$('[data-check-all]')).length > 0;
  assert.ok(cards.every(card => card.actionHeight === (hasActions ? 24 : 0)), 'Action space collapses when all lists fit');
  assert.ok(cards.every(card => card.labels.every(text => !/^[✔✓☑✅]/u.test(text) && !/\bWhatsap\b/i.test(text))));
  assert.ok(cards.every(card => new Set(card.labels.map(text => text.toLowerCase().replace(/[-\s]+/g, ' '))).size === card.labels.length));
}

async function expand(page, id) {
  const before = await page.$eval('[data-pricing-grid]', node => Number(node.dataset.cardHeight));
  await page.click(`[data-pricing-card="${id}"] [data-check-all]`);
  await page.waitForFunction(before => Number(document.querySelector('[data-pricing-grid]').dataset.cardHeight) > before, {}, before);
  await settle(page);
  await checkControls(page);
  return page.$eval('[data-pricing-grid]', node => Number(node.dataset.cardHeight));
}

async function checkPageScrollAfterExpansion(page) {
  const selector = '[data-pricing-card="plan-1"] [data-pricing-features]';
  await page.$eval(selector, node => node.scrollIntoView({ block: 'center', behavior: 'instant' }));
  const point = await page.$eval(selector, node => {
    const box = node.getBoundingClientRect();
    return { x: box.left + box.width / 2, y: box.top + box.height / 2 };
  });
  // Start a fresh wheel gesture over the fully expanded feature list.
  await page.mouse.move(4, 4);
  await page.mouse.move(point.x, point.y);
  const before = await page.evaluate(() => scrollY);
  await page.mouse.wheel({ deltaY: 180 });
  await page.waitForFunction(before => scrollY > before + 1, {}, before);
  assert.equal(await page.$eval(selector, node => node.scrollHeight > node.clientHeight + 1), false);
}

async function exercise(page, url, label) {
  for (const width of [1440, 390]) {
    await page.setViewport({ width, height: 1000 });
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('main section>button[aria-expanded]');
    await page.click('main section>button[aria-expanded]');
    await settle(page);
    await page.waitForFunction(() => {
      const section = document.querySelector('main section>button[aria-expanded="true"]')?.parentElement;
      return section && section.getAnimations({ subtree: true }).every(animation => animation.playState !== 'running');
    });
    await checkControls(page);
    const compact = await page.$eval('[data-pricing-grid]', node => Number(node.dataset.cardHeight));
    assert.ok(await page.$('[data-pricing-card="plan-1"] [data-check-all]'), 'Long list has Check all');
    assert.ok(await page.$('[data-pricing-card="plan-2"] [data-check-all]'), 'Medium list has Check all');
    await page.screenshot({ path: path.join(artifacts, `${label}-${width}-compact.png`), fullPage: true });
    const scroller = await page.$('[data-pricing-card="plan-1"] [data-pricing-features]');
    await scroller.focus();
    await page.keyboard.press('End');
    await page.waitForFunction(() => {
      const list = document.querySelector('[data-pricing-card="plan-1"] [data-pricing-features]');
      return list.scrollTop > 0 && list.scrollTop + list.clientHeight >= list.scrollHeight - 1;
    });
    const intermediate = await expand(page, 'plan-2');
    assert.equal(await page.$('[data-pricing-card="plan-2"] [data-check-all]'), null, 'Expanded list no longer needs Check all');
    assert.ok(await page.$('[data-pricing-card="plan-1"] [data-check-all]'), 'Longest list can still expand');
    const full = await expand(page, 'plan-1');
    assert.equal(await page.$$eval('[data-check-all]', nodes => nodes.length), 0, 'All lists fit at the largest size');
    assert.ok(full > intermediate && intermediate > compact);
    await page.screenshot({ path: path.join(artifacts, `${label}-${width}-expanded.png`), fullPage: true });
    await checkPageScrollAfterExpansion(page);
    console.log(`${label} ${width}px: equal heights ${compact} → ${intermediate} → ${full}; list/page scrolling, conditional actions and visible footers passed.`);
  }
  for (const width of [320, 768]) {
    await page.setViewport({ width, height: 1000 });
    await settle(page);
    await checkControls(page);
  }
}

async function checkPricingSearch(page) {
  const firstHint = 'Search courses, topics, mocks, or AI viva';
  const exampleHint = 'Try: “Find plans with AI viva”';
  await page.setViewport({ width: 1440, height: 1000 });
  await page.goto(`${cms}/pricing-preview-local`, { waitUntil: 'networkidle0', timeout: 120000 });
  await page.click('main section>button[aria-expanded]');
  await settle(page);
  const style = await page.$eval('[data-pricing-search]', wrapper => {
    const input = wrapper.querySelector('input');
    return { wrapperBackground: getComputedStyle(wrapper).backgroundColor, inputBackground: getComputedStyle(input).backgroundColor,
      shadow: getComputedStyle(wrapper).boxShadow, border: getComputedStyle(wrapper).borderTopWidth };
  });
  assert.equal(style.wrapperBackground, 'rgba(0, 0, 0, 0)');
  assert.equal(style.inputBackground, 'rgba(0, 0, 0, 0)');
  assert.equal(style.shadow, 'none');
  assert.equal(style.border, '0px');
  assert.equal(await page.$eval('[data-pricing-search-hint]', node => node.getAttribute('aria-hidden')), 'true');
  await page.waitForFunction(text => {
    const hint = document.querySelector('[data-pricing-search-hint] span');
    return hint?.textContent === text && Number(getComputedStyle(hint).opacity) > .99;
  }, { timeout: 7500 }, exampleHint);
  assert.equal(await page.$eval('[aria-label="Search plans"]', node => node.value), '');
  await (await page.$('[data-pricing-search]')).screenshot({ path: path.join(artifacts, 'search-desktop.png') });
  await page.setViewport({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await (await page.$('[data-pricing-search]')).screenshot({ path: path.join(artifacts, 'search-mobile.png') });
  await page.click('[aria-label="Search plans"]');
  await page.waitForSelector('[data-pricing-search-hint]', { hidden: true });
  assert.equal(await page.$eval('[aria-label="Search plans"]', node => node.placeholder), firstHint);
  await page.type('[aria-label="Search plans"]', 'ELITE');
  await page.waitForFunction(() => document.querySelectorAll('[data-pricing-card]').length === 1);
  assert.match(await page.$eval('[data-pricing-card] h3', node => node.textContent), /Elite/);
  await page.click('[aria-label="Clear search"]');
  await page.waitForSelector('[data-pricing-search-hint]');
  assert.equal(await page.$$eval('[data-pricing-card]', nodes => nodes.length), 4);
  await page.type('[aria-label="Search plans"]', 'Find plans with AI viva');
  await page.waitForSelector('[data-pricing-search-feedback]');
  assert.match(await page.$eval('[data-pricing-search-feedback]', node => node.textContent), /Press Enter or choose AI search/);
  assert.doesNotMatch(await page.$eval('main', node => node.textContent), /No matching plans found/);
  await page.keyboard.press('Enter');
  await page.waitForFunction(() => document.querySelector('[data-pricing-card]')?.textContent.includes('Includes AI viva practice.'));
  assert.equal(await page.$eval('[aria-label="Search plans"]', node => node.value), 'Find plans with AI viva');
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'reduce' }]);
  await page.click('[aria-label="Clear search"]');
  await page.waitForSelector('[data-pricing-search-hint]');
  await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 4400)));
  assert.equal(await page.$eval('[data-pricing-search-hint]', node => node.textContent), firstHint);
  await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'no-preference' }]);
  console.log('Pricing search passed: transparent surfaces, rotating hints, focus/typing pause, filtering, clearing, AI submit and static reduced-motion hint.');
}

(async () => {
  assert.equal(fs.existsSync(fixturePath), false, 'Refusing to overwrite a preview route');
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, fixture);
  fs.mkdirSync(artifacts, { recursive: true });
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  let browser;
  try {
    browser = await puppeteer.launch({ executablePath, headless: true, timeout: 60000 });
    const page = await browser.newPage();
    await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'light' }]);
    const errors = [];
    const aiQueries = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      const respond = body => request.respond({ status: 200, contentType: 'application/json', body: JSON.stringify(body) });
      if (url.pathname.endsWith('/api/pricing-plans')) return respond({ plans, coupons: [] });
      if (url.pathname.endsWith('/api/public/plans/search')) {
        aiQueries.push(JSON.parse(request.postData()).query);
        return respond({ plans: [{ id: 'plan-1', matchedBy: 'plan-info', matchReason: 'Includes AI viva practice.', matches: [] }] });
      }
      if (url.pathname.endsWith('/api/verify-coupon-web')) return respond({ applied: true, coupon: { code: 'SAVE10' }, pricing: { originalPrice: 690, discountedPrice: 621 } });
      if (url.pathname.includes('/api/')) return respond({ success: true });
      if (!['localhost', '127.0.0.1'].includes(url.hostname) && !url.protocol.startsWith('data')) return request.abort();
      request.continue();
    });
    await exercise(page, `${cms}/pricing-preview-local`, 'cms');
    const card = await page.$('[data-pricing-card="plan-0"]');
    await card.$$eval('button', nodes => nodes.find(node => node.textContent.trim() === '12 months').click());
    assert.match(await card.$eval('a', node => node.href), /versionId=twelve/);
    await card.$$eval('button', nodes => nodes.find(node => node.textContent.includes('SAVE10')).click());
    await page.waitForFunction(() => document.querySelector('[data-pricing-card="plan-0"] a').href.includes('couponCode=SAVE10'));
    await settle(page);
    await checkControls(page);
    await card.$$eval('button', nodes => nodes.find(node => node.textContent.trim() === '6 months').click());
    assert.doesNotMatch(await card.$eval('a', node => node.href), /couponCode=/);
    await checkPricingSearch(page);
    assert.deepEqual(aiQueries, ['Find plans with AI viva']);
    await exercise(page, `${testing}/web/plans`, 'testing');
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await page.waitForFunction(() => getComputedStyle(document.querySelector('[data-pricing-card]')).transitionProperty === 'none');
    assert.deepEqual(errors, []);
    console.log('Pricing checks passed: responsive shared sizing, staged expansion, hidden scrollbars, keyboard scroll, coupons, checkout and reduced motion.');
  } finally {
    if (browser) await browser.close();
    if (fs.existsSync(fixturePath) && fs.readFileSync(fixturePath, 'utf8') === fixture) fs.unlinkSync(fixturePath);
    const generatedType = path.resolve('.next/dev/types/app/pricing-preview-local/page.ts');
    if (fs.existsSync(generatedType)) fs.unlinkSync(generatedType);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
