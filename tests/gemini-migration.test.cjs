const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules, env = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(code, {
    exports, process: { env }, console: { error() {} },
    require: name => {
      if (name === 'server-only') return {};
      if (Object.hasOwn(modules, name)) return modules[name];
      throw new Error(`Unexpected import: ${name}`);
    },
  });
  return exports;
}

function fixture(output, env = { GEMINI_API_KEY: ' test-server-key ', GEMINI_MODEL: ' test-model ' }) {
  const constructors = [];
  const requests = [];
  class GoogleGenAI {
    constructor(options) {
      constructors.push(options);
      this.models = { generateContent: async request => {
        requests.push(request);
        if (output instanceof Error) throw output;
        return { text: output };
      } };
    }
  }
  const gemini = load('lib/gemini.ts', { '@google/genai': { GoogleGenAI } }, env);
  const query = { where: () => query, orderBy: () => query, limit: () => query, get: async () => ({ docs: [] }) };
  const modules = {
    '@/lib/gemini': gemini,
    '@/lib/firebaseAdmin': { getAdminDb: () => ({ collection: () => query }) },
    'firebase-admin/firestore': { FieldValue: {} },
    '@/lib/server/notificationService': {},
    '@/lib/server/pricingService': {},
    '@/lib/server/adminAccess': { requireAdminSession: async () => ({}) },
    'next/server': { NextResponse: { json: (body, init) => ({ body, status: init?.status || 200 }) } },
  };
  return { gemini, constructors, requests, modules, daily: () => load('lib/server/dailyQuizService.ts', modules) };
}

test('missing, empty and whitespace keys fail before constructing a client', () => {
  for (const value of [undefined, '', ' \n\t ']) {
    const { gemini, constructors } = fixture('', { GEMINI_API_KEY: value, NEXT_PUBLIC_GEMINI_API_KEY: 'never-use-client-key' });
    assert.throws(() => gemini.getGeminiClient(), /GEMINI_API_KEY is missing or blank/);
    assert.equal(constructors.length, 0);
  }
});

test('client uses the trimmed server key and model override without changing JSON settings', () => {
  const { gemini, constructors } = fixture('');
  gemini.getGeminiClient();
  assert.equal(constructors[0].apiKey, 'test-server-key');
  assert.equal(gemini.getGeminiModelName(), 'test-model');
  assert.deepEqual(JSON.parse(JSON.stringify(gemini.GEMINI_JSON_CONFIG)), { responseMimeType: 'application/json', temperature: 0 });
  for (const model of [undefined, '', '  ']) {
    assert.equal(fixture('', { GEMINI_MODEL: model }).gemini.getGeminiModelName(), 'gemini-2.5-flash');
  }
});

test('daily topic selection reads response.text and retains fenced-JSON handling', async () => {
  const { daily, requests } = fixture('```json\n{"examTrack":"FEBU","topic":"Renal stones"}\n```');
  const result = await daily().pickUrologicsDailyQuizTopic();
  assert.equal(result.topic, 'Renal stones');
  assert.equal(result.examTrack, 'FEBU');
  assert.equal(requests[0].model, 'test-model');
  assert.match(requests[0].contents, /Avoid repeating recent topics/);
  assert.equal(requests[0].config, undefined);
});

test('daily quiz generation preserves prompts, defaults and five-option validation', async () => {
  const payload = { question: 'Which investigation?', options: ['A', 'B', 'C', 'D', 'E'], correctIndex: 2, explanation: 'Explanation' };
  const { daily, requests } = fixture(`\`\`\`json\n${JSON.stringify(payload)}\n\`\`\``);
  const result = await daily().generateDailyQuizFromTopic('Renal stones');
  assert.deepEqual(JSON.parse(JSON.stringify(result)), { ...payload, image: '' });
  assert.match(requests[0].contents, /Topic: Renal stones/);
  assert.match(requests[0].contents, /5 options only/);
  assert.equal(requests[0].model, 'test-model');
  assert.equal(requests[0].config, undefined);
  const invalid = fixture('{"question":"Q","options":["A"]}');
  await assert.rejects(invalid.daily().generateDailyQuizFromTopic('Topic'), /Invalid AI structure/);
});

test('malformed and empty quiz responses preserve application errors', async () => {
  for (const output of ['not json', undefined]) {
    const { daily } = fixture(output);
    await assert.rejects(daily().generateDailyQuizFromTopic('Topic'), /AI returned invalid format/);
    await assert.rejects(daily().pickUrologicsDailyQuizTopic(), /AI returned invalid topic format/);
  }
});

for (const mode of ['calmAndComposed', 'fastAndFurious']) {
  test(`${mode} generation retains JSON settings, deduplication and exhibit validation`, async () => {
    const { modules, requests } = fixture(JSON.stringify({ questions: [
      { question: 'Existing?', answerKeywords: [], linkedExhibitIds: [] },
      { question: ' New question? ', answerKeywords: [' key ', 'key'], linkedExhibitIds: ['wrong', 'image', 'image'] },
    ] }));
    const route = load('app/api/viva-cases/generate-questions/route.ts', modules);
    const response = await route.POST({ json: async () => ({ stem: 'Case stem', mode, existingQuestions: ['Existing?'], exhibits: [{ id: 'image' }] }) });
    assert.equal(response.status, 200);
    assert.deepEqual(JSON.parse(JSON.stringify(response.body)), { questions: [{ question: 'New question?', answerKeywords: ['key'], linkedExhibitIds: ['image'] }] });
    assert.equal(requests[0].model, 'test-model');
    assert.equal(requests[0].config.temperature, 0);
    assert.equal(requests[0].config.responseMimeType, 'application/json');
    assert.match(requests[0].contents, new RegExp(`Mode: ${mode}`));
    assert.match(requests[0].contents, /Existing questions \(fixed, do not repeat or rewrite these/);
  });
}

test('plan search consumes text and retains lexical fallback on generation failure', async () => {
  const success = fixture('{"topics":["renal"],"contentTypes":["video"],"keywords":["stones"]}');
  const result = await load('lib/server/planDiscoveryService.ts', success.modules).discoverPlansForQuery('renal stones');
  assert.equal(result.interpretedAs.contentTypes[0], 'video');
  assert.equal(success.requests[0].model, 'test-model');
  assert.equal(success.requests[0].config.temperature, 0);
  assert.equal(success.requests[0].config.responseMimeType, 'application/json');
  const failure = fixture(new Error('Service unavailable'));
  const fallback = await load('lib/server/planDiscoveryService.ts', failure.modules).discoverPlansForQuery('renal stones');
  assert.deepEqual(Array.from(fallback.interpretedAs.keywords), ['renal', 'stones']);
});
