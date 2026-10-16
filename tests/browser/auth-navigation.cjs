/* eslint-disable @typescript-eslint/no-require-imports */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../../../testing-zone/node_modules/puppeteer-core');

const origin = process.env.CMS_TEST_ORIGIN || 'http://127.0.0.1:3025';
if (!['localhost','127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local server required.');
const fixturePath = path.resolve('app/auth-navigation-preview/page.tsx');
const fixture = 'import { LandingHeader } from "@/components/landing-page/Header";\nexport default function Preview() { return <main><LandingHeader /><div className="h-screen bg-white" /></main>; }\n';

(async () => {
  if (fs.existsSync(fixturePath)) throw new Error('Preview route already exists.');
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe','C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, timeout: 60000 });
  try {
    fs.mkdirSync(path.dirname(fixturePath),{recursive:true});
    fs.writeFileSync(fixturePath,fixture);
    const artifacts = path.resolve('.test-artifacts/auth-navigation');
    fs.mkdirSync(artifacts,{recursive:true});
    for (const width of [1366,390]) {
      const page = await browser.newPage();
      const errors = [], documents = [];
      page.on('pageerror',error => { errors.push(error.message); console.error('Browser error:', error.message); });
      await page.setViewport({width,height:900});
      await page.setRequestInterception(true);
      page.on('request',request => {
        const url = new URL(request.url());
        if (request.isNavigationRequest() && request.frame() === page.mainFrame()) documents.push(url);
        if (url.pathname.includes('/api/')) return request.respond({status:200,contentType:'application/json',body:JSON.stringify({countries:[{label:'United Kingdom (+44)',value:'United Kingdom-+44'}]})});
        if (!['localhost','127.0.0.1'].includes(url.hostname) && !url.protocol.startsWith('data')) return request.abort();
        return request.continue();
      });
      async function openFromHeader(mode) {
        console.log(`Checking ${width}px ${mode} navigation`);
        await page.goto(`${origin}/auth-navigation-preview`,{waitUntil:'networkidle0',timeout:120000});
        await page.waitForFunction(() => document.querySelector('[aria-label="Toggle menu"]'));
        if (width<768) await page.click('[aria-label="Toggle menu"]');
        await Promise.all([
          page.waitForNavigation({waitUntil:'networkidle0',timeout:120000}),
          page.$$eval(`a[href="/login?mode=${mode}"]`,nodes => nodes.find(node => node.getClientRects().length>0).click()),
        ]);
        await page.waitForFunction(expected => location.pathname === '/login' && new URL(location.href).searchParams.get('mode') === expected, {}, mode);
        await page.waitForSelector(mode === 'login' ? '#login-password' : '#signup-name');
        assert.equal(new URL(page.url()).searchParams.get('mode'),mode);
        assert.ok(documents.some(url => url.pathname==='/login' && url.searchParams.get('mode')===mode),'Account link requests a complete fresh document');
        assert.ok(await page.$('img[alt="Urologics — Dr Ankit Goel"]'));
        const centered = await page.$eval('main header p',node => {
          const range = document.createRange(); range.selectNodeContents(node);
          const text = range.getBoundingClientRect(), box = node.getBoundingClientRect();
          return {alignment:getComputedStyle(node).textAlign,offset:Math.abs(text.x+text.width/2-box.x-box.width/2)};
        });
        assert.equal(centered.alignment,'center'); assert.ok(centered.offset<2);
        assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
      }
      await openFromHeader('login');
      assert.ok(await page.$('#login-password'));
      await page.screenshot({path:path.join(artifacts,`login-${width}.png`),fullPage:true});
      await openFromHeader('signup');
      assert.ok(await page.$('#signup-name'));
      console.log('Switching signup panel to login');
      await page.waitForFunction(() => [...document.querySelectorAll('button')].some(node => node.textContent.trim() === 'Sign in' && Object.keys(node).some(key => key.startsWith('__reactProps'))), {timeout:120000});
      await page.$$eval('button[type="button"]',nodes=>nodes.find(node=>node.textContent.trim()==='Sign in').click());
      await page.waitForFunction(() => new URL(location.href).searchParams.get('mode') === 'login');
      assert.equal(new URL(page.url()).searchParams.get('mode'),'login');
      await page.reload({waitUntil:'networkidle0'}); assert.ok(await page.$('#login-password'));
      await page.goto(`${origin}/login?next=%2Fweb%2Fcourses`,{waitUntil:'networkidle0'});
      const canonical=new URL(page.url());
      assert.equal(canonical.searchParams.get('mode'),'login');
      assert.equal(canonical.searchParams.get('next'),'/web/courses');
      assert.deepEqual(errors,[]);
      await page.close();
    }
    console.log('Desktop/mobile Login and Sign up open the shared panel; fresh navigation, centered headings, refresh and return paths verified.');
  } finally {
    await browser.close();
    if (fs.existsSync(fixturePath) && fs.readFileSync(fixturePath,'utf8')===fixture) fs.unlinkSync(fixturePath);
    const generated=path.resolve('.next/dev/types/app/auth-navigation-preview/page.ts');
    if (fs.existsSync(generated)) fs.unlinkSync(generated);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
