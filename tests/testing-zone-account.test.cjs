const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(relative, modules = {}) {
  const exports = {};
  const file = path.resolve('../testing-zone',relative);
  const code = ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  vm.runInNewContext(code,{exports,Date,console,require:name=>modules[name] || (name === 'react' || name === 'react/jsx-runtime' ? require(name) : {})});
  return exports;
}
const {latestLiveTests}=load('lib/overview-tests.ts');
const now=Date.parse('2026-10-15T12:00:00Z');
const mock=(id,minutesAgo,hasAttempted=false)=>({id,startTime:new Date(now-minutesAgo*60000).toISOString(),durationMinutes:120,hasAttempted,accessType:'public'});
test('overview selects only three live tests, preferring unattempted and then latest',()=>{
  const values=[mock('attended',1,true),mock('old',10),mock('new',2),mock('middle',5),mock('older',15),mock('future',-10),mock('expired',180)];
  assert.deepEqual(Array.from(latestLiveTests(values,now),item=>item.id),['new','middle','old']);
});
test('overview respects explicit end times and public/attended filters',()=>{
  const values=[{...mock('ended',1),endTime:new Date(now-1000).toISOString()},mock('first',2,true),{...mock('restricted',3),accessType:'restricted'},mock('public',5)];
  assert.deepEqual(Array.from(latestLiveTests(values,now,'attended'),item=>item.id),['first']);
  assert.deepEqual(Array.from(latestLiveTests(values,now,'public'),item=>item.id),['public','first']);
});
test('overview understands Firestore timestamps and excludes unscheduled tests',()=>{
  const values=[{...mock('seconds',1),startTime:{_seconds:(now-60000)/1000}},{id:'missing',durationMinutes:60}];
  assert.deepEqual(Array.from(latestLiveTests(values,now),item=>item.id),['seconds']);
});
const {purchaseCategory}=load('components/profile/PurchaseHistory.tsx');
test('purchase tabs classify completed, pending, cancelled and failed provider statuses',()=>{
  for(const status of ['COMPLETED','SUCCEEDED','CAPTURED']) assert.equal(purchaseCategory(status),'succeeded');
  for(const status of ['CREATED','APPROVED','PENDING',undefined]) assert.equal(purchaseCategory(status),'pending');
  for(const status of ['CANCELLED','CANCELED','VOIDED','FAILED','DENIED','REFUNDED']) assert.equal(purchaseCategory(status),'cancelled');
});
const {descriptionPoints}=load('components/ui/DescriptionBullets.tsx');
test('description bullets support new points and existing plain-text/numbered descriptions',()=>{
  assert.deepEqual(Array.from(descriptionPoints('• Timed mock\n- Full explanations\n3. Ranked result\n\n')),['Timed mock','Full explanations','Ranked result']);
  assert.deepEqual(Array.from(descriptionPoints('Existing description')),['Existing description']);
});
test('profile upload proxy forwards the authenticated user to the learner upload endpoint',async()=>{
  const calls=[];
  const exports={};
  const source=ts.transpileModule(fs.readFileSync('../testing-zone/app/api/urologics/cloudinary-upload/route.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  const body={test:'file'};
  vm.runInNewContext(source,{exports,console,fetch:async(url,options)=>{calls.push({url,options});return{status:200,json:async()=>({url:'image.png'})};},require:name=>name==='next/server'?{NextResponse:{json:(data,options)=>({data,...options})}}:{getAuthHeader:req=>req.token,getUrologicsApiUrl:path=>`https://api.example.test${path}`}});
  assert.equal((await exports.POST({token:null})).status,401);
  assert.equal(calls.length,0);
  await exports.POST({token:'Bearer candidate',formData:async()=>body});
  assert.equal(calls[0].url,'https://api.example.test/api/app/profile/image');
  assert.equal(calls[0].options.headers.Authorization,'Bearer candidate');
  assert.equal(calls[0].options.body,body);
});
