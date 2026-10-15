const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../../../testing-zone/node_modules/puppeteer-core');

const origin = process.env.CMS_TEST_ORIGIN || 'http://127.0.0.1:3025';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Use a local development server.');
const fixturePath = path.resolve('app/faq-preview-local/page.tsx');
const fixture = 'import { FaqSection } from "@/components/landing-page/FaqSection";\nimport { PricingSection } from "@/components/landing-page/PricingSection";\nexport default function Preview() { return <main className="min-h-screen bg-cyan-50/40 pt-8"><PricingSection /><FaqSection /></main>; }\n';

(async () => {
  if (fs.existsSync(fixturePath)) throw new Error('Preview route already exists; refusing to overwrite it.');
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, timeout: 60000 });
  const artifacts = path.resolve('.test-artifacts/landing-faq');
  try {
    fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
    fs.writeFileSync(fixturePath, fixture);
    fs.mkdirSync(artifacts, { recursive: true });
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1366, height: 1000 });
    await page.goto(`${origin}/faq-preview-local`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('#faqs button');
    assert.equal(await page.$$eval('#faqs button[aria-expanded]', nodes => nodes.length), 8);
    assert.match(await page.$eval('#faqs', node => node.previousElementSibling.innerText), /Choose a plan/);
    assert.equal(await page.$$eval('#faqs button[aria-expanded="true"]', nodes => nodes.length), 0);
    const border = await page.$eval('#faqs article', node => ({ color: getComputedStyle(node).borderRightColor, width: getComputedStyle(node).borderRightWidth }));
    assert.deepEqual(border, { color: 'rgb(15, 120, 150)', width: '4px' });
    const questions = await page.$$('#faqs button');
    await questions[0].click();
    await page.waitForFunction(() => { const panel = document.querySelector('#faqs [role="region"]'); return panel.getBoundingClientRect().height >= panel.scrollHeight - 1 && Number(getComputedStyle(panel).opacity) > 0.99; });
    assert.match(await page.$eval('#faqs [role="region"]', node => node.innerText), /Dr Ankit Goel/);
    assert.ok(await page.$$eval('#faqs [role="region"] strong', nodes => nodes.some(node => node.textContent === 'Dr Ankit Goel')));
    await page.$eval('#faqs', node => node.scrollIntoView());
    await page.screenshot({ path: path.join(artifacts, 'desktop.png') });
    await questions[1].focus();
    await page.keyboard.press('Enter');
    assert.equal(await questions[0].evaluate(node => node.getAttribute('aria-expanded')), 'false');
    assert.equal(await questions[1].evaluate(node => node.getAttribute('aria-expanded')), 'true');
    await page.keyboard.press('Space');
    assert.equal(await questions[1].evaluate(node => node.getAttribute('aria-expanded')), 'false');
    await questions[7].click();
    const answer = await page.$eval('#faqs button[aria-expanded="true"]', node => node.getAttribute('aria-controls'));
    assert.equal(await page.$eval(`[id="${answer}"] a`, node => node.href), 'https://urologics.co.uk/');
    for (const width of [320, 390, 768]) {
      await page.setViewport({ width, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `No overflow at ${width}px`);
    }
    await page.setViewport({ width: 390, height: 844 });
    await questions[0].click();
    await page.waitForFunction(() => { const panel = document.querySelector('#faqs [role="region"]'); return panel.getBoundingClientRect().height >= panel.scrollHeight - 1 && Number(getComputedStyle(panel).opacity) > 0.99; });
    await page.$eval('#faqs', node => node.scrollIntoView());
    await page.screenshot({ path: path.join(artifacts, 'mobile.png') });
    await page.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
    await questions[2].click();
    await page.waitForFunction(() => document.querySelectorAll('#faqs button[aria-expanded="true"]').length === 1);
    assert.deepEqual(errors, []);
    console.log('FAQ browser checks passed: eight answers, placement after plans, primary border, highlights, link, keyboard toggles, reduced motion and responsive layouts.');
  } finally {
    await browser.close();
    if (fs.existsSync(fixturePath) && fs.readFileSync(fixturePath, 'utf8') === fixture) fs.unlinkSync(fixturePath);
    const generatedType = path.resolve('.next/dev/types/app/faq-preview-local/page.ts');
    if (fs.existsSync(generatedType)) fs.unlinkSync(generatedType);
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
