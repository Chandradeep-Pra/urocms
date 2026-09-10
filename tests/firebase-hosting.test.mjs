import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync, readdirSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const read = file => readFileSync(new URL(`../${file}`,import.meta.url),'utf8');
function load(file, env = {}) {
  const exports = {};
  vm.runInNewContext(ts.transpileModule(read(file), {compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports,URL,process:{env}});
  return exports;
}
test('Hosting sends both web paths to the second service before the catch-all',()=>{
  const {hosting}=JSON.parse(read('firebase.json'));
  assert.equal(hosting.site,'proud-woods-489814-s6');
  assert.equal(hosting.public,'firebase-hosting-empty');
  assert.deepEqual(hosting.rewrites,[
    {source:'/web',run:{serviceId:'urologics-web-app',region:'asia-south1'}},
    {source:'/web/**',run:{serviceId:'urologics-web-app',region:'asia-south1'}},
    {source:'**',run:{serviceId:'urologics-web',region:'asia-south1'}},
  ]);
  assert.deepEqual(readdirSync(new URL('../firebase-hosting-empty/',import.meta.url)).filter(name=>!name.startsWith('.')),[]);
});
test('main Next configuration retains standalone/external packages without web interception',()=>{
  const {default: config}=load('next.config.ts');
  assert.equal(config.output,'standalone');
  assert.ok(config.serverExternalPackages.includes('firebase-admin'));
  assert.ok(config.serverExternalPackages.includes('@google-cloud/tasks'));
  assert.equal(config.basePath,undefined);
  assert.equal(config.rewrites,undefined);
});
test('login redirects allow only production app routes and preserve checkout parameters',()=>{
  const {getSafeAppRedirect: safe}=load('lib/user-app.ts');
  for (const bad of [null,'https://evil.test/web','https://legacy.vercel.app/web','/dashboard','/website','/web-other','/\\evil.test/web','https://user:pass@urologics.co.uk/web']) assert.equal(safe(bad),'/web');
  assert.equal(safe('https://urologics.co.uk/web/courses?x=1'),'/web/courses?x=1');
  assert.equal(safe('/checkout?planId=1&versionId=2'),'/checkout?planId=1&versionId=2');
  assert.equal(safe('/web'),'/web');
});
test('canonical URL uses production domain with no deployment-provider fallback',()=>{
  assert.equal(load('lib/site.ts',{NODE_ENV:'production'}).getSiteUrl(),'https://urologics.co.uk');
  assert.equal(load('lib/site.ts',{NODE_ENV:'development'}).getSiteUrl(),'http://localhost:3000');
  assert.equal(load('lib/site.ts',{NEXT_PUBLIC_SITE_URL:'https://urologics.co.uk'}).getSiteUrl(),'https://urologics.co.uk');
});
