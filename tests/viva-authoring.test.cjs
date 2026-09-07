const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, mocks) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require: name => mocks[name] });
  return module.exports;
}
const blank = id => ({id, question: '', answerKeywords: [], linkedExhibitIds: []});
const { fillRemainingQuestions } = load('lib/viva-question-generation.ts', {
  '@/components/viva/types': { createFastQuestion: () => blank('new-slot') },
});
test('generation preserves authored prompts, IDs, keywords and exhibits, filling only gaps', () => {
  const fixed = {...blank('fixed'), question: 'Existing?', answerKeywords: ['key'], linkedExhibitIds: ['image']};
  const later = {...blank('later'), question: 'Later?'};
  const current = [fixed, blank('gap'), later];
  const generated = [{question: 'New?', answerKeywords: ['new'], linkedExhibitIds: []}];
  const result = fillRemainingQuestions(current, generated, 4);
  assert.equal(result[0], fixed);
  assert.equal(result[2], later);
  assert.equal(result[1].id, 'gap');
  assert.equal(result[1].question, 'New?');
  assert.equal(result[3].question, '');
  assert.equal(current[1].question, '');
});
test('repeated generation ignores duplicates and can fill missing trailing slots', () => {
  const fixed = {...blank('fixed'), question: 'Existing?'};
  const incoming = [' existing? ', 'New?', 'New?', 'Last?'].map(question => ({question, answerKeywords: [], linkedExhibitIds: []}));
  const result = fillRemainingQuestions([fixed], incoming, 3);
  assert.equal(result.length, 3);
  assert.equal(result[0], fixed);
  assert.equal(result[1].question, 'New?');
  assert.equal(result[2].question, 'Last?');
  assert.equal(fillRemainingQuestions(result, incoming, 3)[0], fixed);
});
const docs = [
  {id:'legacy', data:()=>({title:'Legacy'})},
  {id:'z', data:()=>({title:'Zebra', sortOrder:1})},
  {id:'a', data:()=>({title:'Alpha', sortOrder:4})},
  {id:'b', data:()=>({title:'Beta', sortOrder:1})},
];
const updates = [];
const db = {collection: () => ({orderBy: () => ({get: async () => ({docs})}), doc: id => ({
  get: async () => ({exists: id !== 'missing'}), update: async data => updates.push({id, data}),
})})};
const service = load('lib/server/vivaService.ts', {
  '@/lib/firebaseAdmin': {getAdminDb: () => db},
  'firebase-admin/firestore': {FieldValue: {serverTimestamp: () => 'timestamp'}},
});
test('folders sort by configured order, then title, with legacy folders retained last', async () => {
  const folders = await service.listVivaFolders();
  assert.equal(folders.map(item => item.id).join(','), 'b,z,a,legacy');
  const cases = await service.attachVivaFolderOrder([{folderId:'z'}, {folderId:'a'}, {}]);
  assert.equal(cases[0].folderSortOrder, 1);
  assert.equal(cases[1].folderSortOrder, 4);
  assert.equal(cases[2].folderSortOrder, Number.MAX_SAFE_INTEGER);
});
test('order updates validate before writing and reject missing folders', async () => {
  for (const value of [-1, 1.2, NaN, Infinity, '2', null]) {
    await assert.rejects(service.updateVivaFolderOrder('z', value), /non-negative integer/);
  }
  await assert.rejects(service.updateVivaFolderOrder('missing', 2), /not found/);
  assert.equal(updates.length, 0);
  await service.updateVivaFolderOrder('z', 0);
  assert.equal(updates[0].data.sortOrder, 0);
});
