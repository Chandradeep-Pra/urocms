const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(options = {}) {
  const state = [0, false, false, 'questions'];
  const messages = [];
  const requests = [];
  const generated = [];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('components/viva/FastAndFuriousDialog.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require(name) {
    if (name === 'react') return { useState(initial) { const i = cursor++; if (state[i] === undefined) state[i] = initial; return [state[i], value => { state[i] = value; }]; } };
    if (name === 'sonner') return { toast: { success: message => messages.push(message), error: message => messages.push(message) } };
    if (name.endsWith('/adminApi')) return { adminFetch: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body) });
      return { ok: !options.error, json: async () => options.error ? { error: options.error } : { questions: [{ question: 'Generated?', answerKeywords: ['answer'], linkedExhibitIds: [] }] } };
    } };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name.endsWith('/types')) return { createFastQuestion: () => ({ id: 'blank', question: '', answerKeywords: [], linkedExhibitIds: [] }) };
    return new Proxy({}, { get: (_, key) => key });
  } });
  const questions = ['a', 'b', 'c'].map(id => ({ id, question: id, answerKeywords: [id], linkedExhibitIds: [id] }));
  let current = questions;
  const mode = options.mode || 'fastAndFurious';
  function render() {
    cursor = 0;
    const tree = module.exports.VivaQuestionSetupDialog({ open: true, mode, form: { case: { stem: options.stem ?? 'Stem' }, marking_criteria: { must_mention: [], critical_fail: [] }, exhibits: [], modes: { [mode === 'fastAndFurious' ? 'calmAndComposed' : 'fastAndFurious']: { questions: options.source || [] }, [mode]: { questions: current, questionCount: options.count ?? current.length } } }, onQuestionsChange: value => { current = value; }, onQuestionsGenerated: value => generated.push(value) });
    const nodes = [];
    function visit(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); nodes.push(node); visit(node.props?.children); }
    visit(tree);
    return nodes;
  }
  return { render, questions, current: () => current, state, messages, requests, generated };
}

function generationButton(ui) {
  ui.state[3] = 'config';
  return ui.render().find(node => node.type === 'Button' && node.props.onClick?.name === 'generateSampleQuestions');
}

for (const mode of ['calmAndComposed', 'fastAndFurious']) {
  test(`${mode} imports the other mode without replacing existing questions or saving`, () => {
    const source = [
      { id: 'source-1', question: 'New?', answerKeywords: ['keyword'], linkedExhibitIds: ['exhibit'] },
      { id: 'source-2', question: ' A ', answerKeywords: [], linkedExhibitIds: [] },
    ];
    const ui = setup({ mode, source });
    const button = ui.render().find(n => n.props.onClick?.name === 'importQuestions');
    assert.ok(button);
    button.props.onClick();
    assert.equal(ui.current().length, 4);
    assert.equal(ui.current()[0], ui.questions[0]);
    assert.equal(ui.current()[3].question, 'New?');
    assert.notEqual(ui.current()[3].id, source[0].id);
    assert.notEqual(ui.current()[3].answerKeywords, source[0].answerKeywords);
    assert.notEqual(ui.current()[3].linkedExhibitIds, source[0].linkedExhibitIds);
    assert.deepEqual(Array.from(ui.current()[3].linkedExhibitIds), ['exhibit']);
    assert.equal(ui.requests.length, 0);
    ui.render().find(n => n.props.onClick?.name === 'importQuestions').props.onClick();
    assert.equal(ui.current().length, 4);
    assert.match(ui.messages[1], /already in this mode/);
  });
}

test('import is hidden without source questions and blocked while busy', () => {
  assert.equal(setup().render().find(n => n.props.onClick?.name === 'importQuestions'), undefined);
  const ui = setup({ source: [{ id: 'source', question: 'New?', answerKeywords: [], linkedExhibitIds: [] }] });
  ui.state[2] = true;
  const button = ui.render().find(n => n.props.onClick?.name === 'importQuestions');
  assert.equal(button.props.disabled, true);
  button.props.onClick();
  assert.equal(ui.current(), ui.questions);
});

test('import fills vacant slots and preserves their IDs', () => {
  const ui = setup({ source: [{ id: 'source', question: 'New?', answerKeywords: [], linkedExhibitIds: [] }] });
  ui.questions[1].question = '';
  ui.render().find(n => n.props.onClick?.name === 'importQuestions').props.onClick();
  assert.equal(ui.current().length, 3);
  assert.equal(ui.current()[1].id, 'b');
  assert.equal(ui.current()[1].question, 'New?');
  assert.equal(ui.current()[2], ui.questions[2]);
});

test('blank case stem allows a click and reports validation without requesting AI', async () => {
  const ui = setup({ stem: '   ', count: 4 });
  const button = generationButton(ui);
  assert.equal(button.props.disabled, false);
  await button.props.onClick();
  assert.match(ui.messages[0], /Add a case stem/);
  assert.equal(ui.requests.length, 0);
});

test('filled slots explain how to add questions without replacing existing ones', async () => {
  const ui = setup();
  const button = generationButton(ui);
  assert.equal(button.props.disabled, false);
  await button.props.onClick();
  assert.match(ui.messages[0], /Increase Question Count/);
  assert.equal(ui.requests.length, 0);
  assert.equal(ui.current(), ui.questions);
});

for (const mode of ['calmAndComposed', 'fastAndFurious']) {
  test(`${mode} generates only remaining questions through the authenticated endpoint`, async () => {
    const ui = setup({ mode, count: 5 });
    await generationButton(ui).props.onClick();
    assert.equal(ui.requests.length, 1);
    assert.equal(ui.requests[0].url, '/api/viva-cases/generate-questions');
    assert.equal(ui.requests[0].body.mode, mode);
    assert.equal(ui.requests[0].body.questionCount, 2);
    assert.deepEqual(ui.requests[0].body.existingQuestions, ['a', 'b', 'c']);
    assert.equal(ui.generated[0][0].question, 'Generated?');
    assert.equal(ui.current(), ui.questions);
    assert.equal(ui.state[1], false);
  });
}

test('AI errors are displayed and the generation button is re-enabled', async () => {
  const ui = setup({ count: 4, error: 'Generation unavailable' });
  await generationButton(ui).props.onClick();
  assert.deepEqual(ui.messages, ['Generation unavailable']);
  assert.equal(ui.generated.length, 0);
  assert.equal(generationButton(ui).props.disabled, false);
});

test('generation is blocked while saving or already generating', async () => {
  for (const index of [1, 2]) {
    const ui = setup({ count: 4 });
    ui.state[index] = true;
    const button = generationButton(ui);
    assert.equal(button.props.disabled, true);
    await button.props.onClick();
    assert.equal(ui.requests.length, 0);
  }
});

test('dragging a middle question preserves its data and the active question', () => {
  const ui = setup();
  ui.state[0] = 1;
  ui.render().find(n => n.type === 'SortableQuestionList').props.onMove('b', 2);
  assert.deepEqual(ui.messages, ['Question order updated']);
  assert.deepEqual(Array.from(ui.current(), q => q.id), ['a', 'c', 'b']);
  assert.equal(ui.current()[2], ui.questions[1]);
  assert.equal(ui.state[0], 2);
});

test('deleting from the middle preserves survivors and selects the next question', () => {
  const ui = setup();
  ui.state[0] = 1;
  ui.render().find(n => n.type === 'SortableQuestionList').props.onDelete('b');
  assert.deepEqual(Array.from(ui.current(), q => q.id), ['a', 'c']);
  assert.equal(ui.current()[1], ui.questions[2]);
  assert.equal(ui.state[0], 1);
  ui.render().find(n => n.type === 'SortableQuestionList').props.onDelete('c');
  ui.render().find(n => n.type === 'SortableQuestionList').props.onDelete('a');
  assert.deepEqual(ui.messages, ['Question deleted', 'Question deleted', 'Question deleted']);
  assert.equal(ui.current().length, 1);
  assert.equal(ui.current()[0].question, '');
  assert.equal(ui.state[0], 0);
});

 test('unchanged order and busy operations do not report success', () => {
  const ui = setup();
  ui.render().find(n => n.type === 'SortableQuestionList').props.onMove('a', 0);
  ui.state[1] = true;
  const list = ui.render().find(n => n.type === 'SortableQuestionList');
  list.props.onMove('a', 2);
  list.props.onDelete('b');
  assert.deepEqual(ui.messages, []);
  assert.equal(ui.current(), ui.questions);
});
