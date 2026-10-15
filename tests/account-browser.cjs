const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const puppeteer = require('../../testing-zone/node_modules/puppeteer-core');
const cms = process.env.CMS_TEST_ORIGIN || 'http://127.0.0.1:3025';
const testing = process.env.TESTING_TEST_ORIGIN || 'http://127.0.0.1:3022';
for (const origin of [cms, testing]) if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Local test origins only');
const artifacts = path.resolve('.test-artifacts/account-ui');
const fixturePath = path.resolve('app/ui-check-local/page.tsx');
const fixtureContent = `"use client";
import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import DescriptionBulletsEditor from "@/components/dashboard/DescriptionBulletsEditor";
import { SignUpDialog } from "@/components/landing-page/SignUpDialog";
export default function Fixture() {
  const [date,setDate] = useState<Date | undefined>(new Date(2026,9,15));
  const [description,setDescription] = useState("Timed mock\\nFull explanations");
  return <main className="mx-auto max-w-md space-y-6 p-6"><Calendar mode="single" captionLayout="dropdown" startMonth={new Date(2020,0)} endMonth={new Date(2036,11)} selected={date} onSelect={setDate} /><p data-testid="selected-date">{date?.toLocaleDateString("en-US")}</p><DescriptionBulletsEditor value={description} onChange={setDescription} /><pre data-testid="description">{description}</pre><SignUpDialog><button>Open signup</button></SignUpDialog></main>;
}`;

(async () => {
  if (fs.existsSync(fixturePath)) throw new Error('Fixture route already exists; refusing to overwrite it.');
  fs.mkdirSync(path.dirname(fixturePath), { recursive: true });
  fs.writeFileSync(fixturePath, fixtureContent);
  fs.mkdirSync(artifacts, { recursive: true });
  const executablePath = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(fs.existsSync);
  const browser = await puppeteer.launch({ executablePath, headless: true, timeout: 60000 });
  const errors = [];
  try {
    const page = await browser.newPage();
    page.on('pageerror', error => errors.push(error.message));
    await page.setViewport({ width: 1366, height: 900 });
    const profile = { uid: 'account-fixture', email: 'candidate@example.test', name: 'Test Candidate', phone: '+44 7700900123', medicalInstitution: 'Test Hospital', activeCourseIds: ['renal'], activeCourses: [{ id: 'renal', title: 'Renal Masterclass' }], activePlanStatus: 'active' };
    const token = [Buffer.from('{"alg":"none"}').toString('base64url'), Buffer.from(JSON.stringify({ sub: profile.uid, user_id: profile.uid, email: profile.email, iat: Math.floor(Date.now()/1000), exp: Math.floor(Date.now()/1000)+3600, auth_time: Math.floor(Date.now()/1000), firebase: { sign_in_provider: 'password' } })).toString('base64url'), 'fixture'].join('.');
    await page.setRequestInterception(true);
    page.on('request', request => {
      const url = new URL(request.url());
      const respond = body => request.respond({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET, POST, OPTIONS' }, body: JSON.stringify(body) });
      if (url.hostname === 'identitytoolkit.googleapis.com') {
        if (url.pathname.endsWith('accounts:signInWithPassword')) return respond({ localId: profile.uid, email: profile.email, displayName: profile.name, idToken: token, refreshToken: 'fixture-refresh', expiresIn: '3600', registered: true });
        if (url.pathname.endsWith('accounts:lookup')) return respond({ users: [{ localId: profile.uid, email: profile.email, displayName: profile.name, providerUserInfo: [{ providerId: 'password', email: profile.email, rawId: profile.email }] }] });
        return respond({});
      }
      if (url.pathname === '/web' && request.resourceType() === 'document') return request.respond({ status: 200, contentType: 'text/html', body: '<h1>Student portal fixture</h1>' });
      if (url.pathname.includes('/api/')) {
        if (url.pathname.includes('/auth/role')) return respond({ isAdmin: false, destination: '/web', studentDestination: '/web' });
        if (url.pathname.endsWith('/access')) return respond({ tier: 'paid', profile });
        if (url.pathname.endsWith('/dial-codes')) return respond({ countries: [{ label: 'United Kingdom (+44)', value: 'United Kingdom-+44' }, { label: 'India (+91)', value: 'India-+91' }] });
        return respond({ success: true });
      }
      if (!['127.0.0.1', 'localhost'].includes(url.hostname) && !url.protocol.startsWith('data')) return request.abort();
      return request.continue();
    });
    console.log('Checking CMS sign-in and signup');
    await page.goto(`${cms}/login`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('#login-password');
    const buttonSizes = await page.$$eval('button', buttons => buttons.filter(button => ['Sign in','Continue with Google'].includes(button.textContent.trim()) && (button.type === 'submit' || button.textContent.includes('Google'))).map(button => ({ width: button.offsetWidth, height: button.offsetHeight })));
    assert.equal(buttonSizes.length, 2); assert.deepEqual(buttonSizes[0], buttonSizes[1]);
    await page.click('[aria-label="Show password"]');
    assert.equal(await page.$eval('#login-password', node => node.type), 'text');
    await page.click('[aria-label="Hide password"]');
    assert.equal(await page.$eval('#login-password', node => node.type), 'password');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: path.join(artifacts,'login-desktop.png'), fullPage: true });
    await page.setViewport({ width: 390, height: 844 });
    await page.screenshot({ path: path.join(artifacts,'login-mobile.png'), fullPage: true });
    await page.$$eval('button', buttons => buttons.find(button => button.textContent.trim() === 'Sign up').click());
    await page.click('button[type="submit"]');
    assert.equal(await page.$$eval('[aria-invalid="true"]', nodes => nodes.length), 7);
    assert.match(await page.$eval('body', node => node.innerText), /Select your country/);
    assert.match(await page.$eval('body', node => node.innerText), /Enter your medical institution/);
    await page.select('#signup-countryValue', 'India-+91');
    assert.match(await page.$eval('label[for="signup-phone"]', node => node.innerText), /\+91/);
    await page.screenshot({ path: path.join(artifacts,'signup-validation-mobile.png'), fullPage: true });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.$$eval('button', buttons => buttons.find(button => button.textContent.trim() === 'Sign in').click());
    await page.type('#login-email', profile.email); await page.type('#login-password','test-password');
    await page.click('button[type="submit"]');
    await page.waitForFunction(() => location.pathname === '/web', { timeout: 30000 }).catch(async error => { console.log('Login diagnostic:', await page.$eval('body',node=>node.innerText)); throw error; });
    console.log('CMS student sign-in automatically redirects');

    await page.goto(`${cms}/ui-check-local`, { waitUntil: 'networkidle0', timeout: 120000 });
    await page.waitForSelector('[data-slot="calendar"]');
    assert.equal(await page.$$eval('[data-slot="calendar"] select', nodes => nodes.length), 2);
    const dimensions = await page.$$eval('[data-slot="calendar"] button[data-day]', nodes => nodes.map(node => ({ width: node.offsetWidth, height: node.offsetHeight })));
    assert.ok(dimensions.length >= 28); assert.ok(dimensions.every(size => size.width >= 32 && size.height >= 32));
    await page.click('[aria-label="Go to the Next Month"]');
    await page.click('[data-day="11/15/2026"]');
    assert.match(await page.$eval('[data-testid="selected-date"]',node=>node.innerText),/11\/15\/2026/);
    await page.$$eval('button', buttons => buttons.find(button => button.textContent.includes('Add point')).click());
    await page.type('[aria-label="Description point 3"]','Ranked first attempt');
    assert.match(await page.$eval('[data-testid="description"]', node => node.innerText), /Ranked first attempt/);
    await page.screenshot({ path: path.join(artifacts,'calendar-and-bullets.png'), fullPage: true });
    await page.$$eval('button', buttons => buttons.find(button => button.textContent === 'Open signup').click());
    await page.click('[role="dialog"] button[type="submit"]');
    assert.match(await page.$eval('[role="dialog"]', node => node.innerText), /Select your country/);
    assert.equal(await page.$$eval('[role="dialog"] [aria-invalid="true"]', nodes => nodes.length), 7);
    await page.close();

    console.log('Checking Testing Zone account, overview, courses and AI cards');
    const student = await browser.newPage();
    student.on('pageerror', error => errors.push(error.message));
    const candidate = { ...profile, idToken: 'fixture-token', refreshToken: 'fixture-refresh', expiresAt: Date.now()+3600000, tier: 'paid' };
    await student.evaluateOnNewDocument(candidate => localStorage.setItem('urologics-testing-zone-auth', JSON.stringify(candidate)),candidate);
    const purchases = Array.from({length:8}, (_,index) => ({id:`success-${index}`,status:'COMPLETED',courseNameSnapshot:`Successful purchase ${index}`,paidAmount:100,currency:'GBP'})).concat([{id:'pending',status:'APPROVED',courseNameSnapshot:'Pending purchase',paidAmount:100,currency:'GBP'},{id:'cancelled',status:'CANCELLED',courseNameSnapshot:'Cancelled purchase',paidAmount:100,currency:'GBP'}]);
    const now = Date.now();
    const mocks = [0,1,2,3,4].map(index => ({id:`live-${index}`,title:`Live test ${index}`,durationMinutes:120,accessType:'public',startTime:new Date(now-index*600000-60000).toISOString(),endTime:new Date(now+3600000).toISOString(),hasAttempted:index===0,description:'Timed mock\nFull explanations'}));
    mocks.push({ ...mocks[1],id:'expired',title:'Expired test',startTime:new Date(now-7200000).toISOString(),endTime:new Date(now-3600000).toISOString() });
    const updates = [], uploads = [];
    const viva = {id:'viva',accessType:'public',case:{title:'Renal viva case',level:'Intermediate',stem:'Clinical assessment',objectives:['Assessment']},modes:{fastAndFurious:{enabled:true},calmAndComposed:{enabled:true}},viva_rules:{max_duration_minutes:10}};
    await student.setRequestInterception(true);
    student.on('request', request => {
      const url = new URL(request.url());
      if (url.pathname.includes('/api/')) {
        let body = {};
        if (url.pathname.endsWith('/access')) body = { tier:'paid',profile,plan:{title:'Core plan'},entitlements:{courseIds:['renal']},vivaCredit:{remainingMinutes:10} };
        else if (url.pathname.endsWith('/purchases')) body={purchases};
        else if (url.pathname.endsWith('/profile') && request.method()==='PATCH') {const change=JSON.parse(request.postData());updates.push(change);Object.assign(profile,change);body={success:true,profile};}
        else if (url.pathname.endsWith('/cloudinary-upload')) {uploads.push(request.headers().authorization);body={url:`${testing}/web/logo.png`};}
        else if (url.pathname.endsWith('/api/mocks')) body={mocks};
        else if (url.pathname.endsWith('/viva-cases')) body={cases:[viva]};
        else if (url.pathname.endsWith('/videos/library')) body={sections:[{id:'renal',title:'Renal Masterclass',videoCount:1,videos:[{id:'r1',title:'Kidney anatomy',provider:'youtube',sectionId:'renal',access:{allowed:true,mode:'full'}}]},{id:'prostate',title:'Prostate Masterclass',videoCount:1,videos:[{id:'p1',title:'Prostate anatomy',provider:'youtube',sectionId:'prostate',access:{allowed:true,mode:'full'}}]}]};
        else if (url.pathname.endsWith('/me/progress')) body={stats:{},recentLessons:[]};
        return request.respond({ status:200, contentType:'application/json', body:JSON.stringify(body) });
      }
      if (!['127.0.0.1','localhost'].includes(url.hostname) && !url.protocol.startsWith('data') && !url.protocol.startsWith('blob')) return request.abort();
      return request.continue();
    });
    await student.setViewport({width:1366,height:1000});
    await student.goto(`${testing}/web/user`,{waitUntil:'networkidle0',timeout:120000});
    await student.waitForSelector('[role="tablist"]');
    assert.match(await student.$eval('#purchase-list', node=>node.innerText),/Successful purchase/);
    assert.equal(await student.$eval('#purchase-list',node=>node.clientHeight),320);
    assert.equal(await student.$eval('#purchase-list',node=>node.scrollHeight>node.clientHeight),true);
    await student.click('#purchase-tab-pending'); assert.match(await student.$eval('#purchase-list',node=>node.innerText),/Pending purchase/); assert.doesNotMatch(await student.$eval('#purchase-list',node=>node.innerText),/Successful purchase/);
    await student.click('#purchase-tab-cancelled'); assert.match(await student.$eval('#purchase-list',node=>node.innerText),/Cancelled purchase/);
    await student.click('summary'); assert.match(await student.$eval('details[open]',node=>node.innerText),/Renal Masterclass/);
    await student.$$eval('button',buttons=>buttons.find(button=>button.textContent.trim()==='Edit').click());
    await student.$eval('input[aria-label="Phone number"]',node=>node.value=''); await student.type('input[aria-label="Phone number"]','+44 7700900456');
    await student.$eval('input[placeholder^="NHS"]',node=>node.value=''); await student.type('input[placeholder^="NHS"]','Updated Hospital');
    const image=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=','base64');
    const photo=path.join(artifacts,'fixture.png');fs.writeFileSync(photo,image);await (await student.$('input[type="file"]')).uploadFile(photo);
    await student.$$eval('button',buttons=>buttons.find(button=>button.textContent.trim()==='Save profile').click());
    await student.waitForFunction(()=>document.body.innerText.includes('+44 7700900456'));
    assert.equal(updates.at(-1).phone,'+44 7700900456');assert.equal(updates.at(-1).medicalInstitution,'Updated Hospital');assert.equal(uploads.at(-1),'Bearer fixture-token');
    await student.screenshot({path:path.join(artifacts,'profile-desktop.png'),fullPage:true});
    await student.setViewport({width:390,height:844});await student.screenshot({path:path.join(artifacts,'profile-mobile.png'),fullPage:true});
    assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);

    await student.goto(`${testing}/web`,{waitUntil:'networkidle0',timeout:120000});
    await student.waitForSelector('.overview-test-row');
    assert.deepEqual(await student.$$eval('.overview-test-row h3',nodes=>nodes.map(node=>node.innerText)),['Live test 1','Live test 2','Live test 3']);
    assert.equal(await student.$('.overview-learning'),null);
    assert.equal(await student.$$eval('.overview-section-gap:empty',nodes=>nodes.length),0);
    assert.equal(await student.$$eval('.overview-test-row ul li',nodes=>nodes.length),6);
    await student.goto(`${testing}/web/courses`,{waitUntil:'networkidle0',timeout:120000});
    await student.type('[aria-label="Search courses and lessons"]','prostate');
    assert.deepEqual(await student.$$eval('h2',nodes=>nodes.map(node=>node.innerText)),['Prostate Masterclass']);
    await student.type('[aria-label="Search courses and lessons"]','missing');assert.match(await student.$eval('body',node=>node.innerText),/No courses or lessons match/);
    await student.click('[aria-label="Clear course search"]');
    assert.equal(await student.$$eval('h2',nodes=>nodes.length),2);
    await student.goto(`${testing}/web/ai-viva/cases`,{waitUntil:'networkidle0',timeout:120000});
    await student.waitForSelector('article');
    assert.doesNotMatch(await student.$eval('header',node=>node.innerText),/Urologics Urologics/);
    await student.$$eval('article button',buttons=>buttons.find(button=>button.textContent.includes('Fast & Furious')).click());
    await student.waitForFunction(() => { const button=[...document.querySelectorAll('article button')].find(node=>node.textContent.includes('Start Urologics')); const context=document.createElement('canvas').getContext('2d'); context.fillStyle=getComputedStyle(button).backgroundColor; context.fillRect(0,0,1,1); const [r,g,b]=context.getImageData(0,0,1,1).data; return r>180 && g>40 && g<160 && b<80; });
    await student.screenshot({path:path.join(artifacts,'viva-fast-mobile.png'),fullPage:true});
    assert.equal(await student.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
    assert.deepEqual(errors,[]);
    console.log('Browser checks passed: sign-in proportions, password visibility, signup validation/countries, automatic student redirect, calendar, bullet editing, phone/institution/photo updates, purchase tabs/scrolling, active courses, latest live tests, empty history, search and Viva branding/colors.');
  } finally {
    await browser.close();
    if (fs.existsSync(fixturePath) && fs.readFileSync(fixturePath,'utf8')===fixtureContent) fs.unlinkSync(fixturePath);
  }
})().catch(error=>{console.error(error);process.exitCode=1;});
