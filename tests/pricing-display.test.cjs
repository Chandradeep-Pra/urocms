const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const exportsObject = {};
const source = ts.transpileModule(fs.readFileSync('lib/pricingDisplay.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(source, { exports: exportsObject });
const { cleanPricingFeatures, cleanPricingText, formatPricingDuration, formatPricingPlanName, pricingSearchFeedback } = exportsObject;

test('feature and course labels display once, without typed checkmarks', () => {
  const lines = [
    { text: '✔ Chapter-wise Tests' },
    { text: 'Chapter-wise Tests' },
    { text: ' ✓ chapter wise tests ' },
    { text: '✅ Full Recordings' },
    { text: '✔✔' },
    { text: 'Chapter-wise Mock Tests', meta: 'Includes timed questions' },
  ];
  const original = JSON.stringify(lines);
  const result = cleanPricingFeatures(lines);
  assert.deepEqual(Array.from(result, item => item.text), ['Chapter-wise Tests', 'Full Recordings', 'Chapter-wise Mock Tests']);
  assert.equal(result[2].meta, 'Includes timed questions');
  assert.equal(JSON.stringify(lines), original, 'Stored/source data is not mutated');
});

test('copy normalization corrects Whatsap without rewriting unrelated wording', () => {
  assert.equal(cleanPricingText(' Dedicated  Whatsap group for doubt solving '), 'Dedicated WhatsApp group for doubt solving');
  assert.equal(cleanPricingText('WhatsApp and AI viva'), 'WhatsApp and AI viva');
  assert.equal(cleanPricingFeatures([{ text: '✔Customisation as per candidate’s requirement' }])[0].text, 'Customisation as per candidate’s requirement');
});

test('plan headings use consistent track names and preserve acronyms', () => {
  assert.equal(formatPricingPlanName('Urologics CORE SBA'), 'Urologics Core SBA');
  assert.equal(formatPricingPlanName('Urologics ELITE Viva'), 'Urologics Elite Viva');
  assert.equal(formatPricingPlanName('Urologics EXECUTIVE mentorship'), 'Urologics Executive Mentorship');
  assert.equal(formatPricingPlanName('Urologics AI FRCS'), 'Urologics AI FRCS');
});

test('duration capitalization is consistent without dropping custom session or mock counts', () => {
  assert.equal(formatPricingDuration('12 Months', 12), '12 months');
  assert.equal(formatPricingDuration('6 Months (16 Sessions)', 6), '6 months (16 sessions)');
  assert.equal(formatPricingDuration('1 Mock', 1), '1 mock');
  assert.equal(formatPricingDuration('8 Sessions', 3), '8 sessions');
  assert.equal(formatPricingDuration('', 1), '1 month');
  assert.equal(formatPricingDuration(undefined, 6), '6 months');
  assert.equal(formatPricingDuration('Lifetime access', 12), 'Lifetime access');
});

const search = overrides => pricingSearchFeedback({ query: 'Find plans with AI viva', searching: false, error: '', hasAiResults: false, ...overrides });
test('an unmatched draft invites AI submission instead of declaring no results', () => {
  assert.equal(search().title, 'Find relevant plans with AI search');
  assert.match(search().detail, /Press Enter or choose AI search/);
  assert.equal(search({ query: 'AI' }).title, 'Keep typing to search');
});

test('pending, failed and completed-empty AI searches have distinct feedback', () => {
  assert.equal(search({ searching: true }).title, 'Finding relevant plans…');
  assert.equal(search({ error: 'Network unavailable' }).title, 'Search could not be completed');
  assert.equal(search({ hasAiResults: true }).title, 'No matching plans found');
  assert.equal(search({ searching: true, hasAiResults: true }).title, 'Finding relevant plans…');
  assert.equal(search({ error: 'Network unavailable', hasAiResults: true }).title, 'Search could not be completed');
});
