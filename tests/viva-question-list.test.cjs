const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup() {
  const state = [0, false, false, null, null, 'questions'];
  let cursor = 0;
  const jsx = (type, props) => ({ type, props });
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync('components/viva/FastAndFuriousDialog.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  vm.runInNewContext(code, { module, exports: module.exports, require(name) {
    if (name === 'react') return { useState(initial) { const i = cursor++; if (state[i] === undefined) state[i] = initial; return [state[i], value => { state[i] = value; }]; } };
    if (name === 'react/jsx-runtime') return { jsx, jsxs: jsx };
    if (name.endsWith('/types')) return { createFastQuestion: () => ({ id: 'blank', question: '', answerKeywords: [], linkedExhibitIds: [] }) };
    return new Proxy({}, { get: (_, key) => key });
  } });
  const questions = ['a', 'b', 'c'].map(id => ({ id, question: id, answerKeywords: [id], linkedExhibitIds: [id] }));
  let current = questions;
  function render() {
    cursor = 0;
    const tree = module.exports.VivaQuestionSetupDialog({ open: true, form: { case: { stem: 'Stem' }, exhibits: [], modes: { fastAndFurious: { questions: current, questionCount: current.length } } }, onQuestionsChange: value => { current = value; } });
    const nodes = [];
    function visit(node) { if (!node || typeof node !== 'object') return; if (Array.isArray(node)) return node.forEach(visit); nodes.push(node); visit(node.props?.children); }
    visit(tree);
    return nodes;
  }
  return { render, questions, current: () => current, state };
}

test('dragging a middle question preserves its data and the active question', () => {
  const ui = setup();
  ui.state[0] = 1;
  let nodes = ui.render();
  nodes.find(n => n.props?.['aria-label'] === 'Reorder question 2').props.onDragStart({ dataTransfer: { setData() {} } });
  nodes = ui.render();
  nodes.filter(n => n.props?.onDrop)[2].props.onDrop({ preventDefault() {} });
  assert.deepEqual(Array.from(ui.current(), q => q.id), ['a', 'c', 'b']);
  assert.equal(ui.current()[2], ui.questions[1]);
  assert.equal(ui.state[0], 2);
});

test('deleting from the middle preserves survivors and selects the next question', () => {
  const ui = setup();
  ui.state[0] = 1;
  ui.render().find(n => n.props?.['aria-label'] === 'Delete question 2').props.onClick();
  assert.deepEqual(Array.from(ui.current(), q => q.id), ['a', 'c']);
  assert.equal(ui.current()[1], ui.questions[2]);
  assert.equal(ui.state[0], 1);
  ui.render().find(n => n.props?.['aria-label'] === 'Delete question 2').props.onClick();
  ui.render().find(n => n.props?.['aria-label'] === 'Delete question 1').props.onClick();
  assert.equal(ui.current().length, 1);
  assert.equal(ui.current()[0].question, '');
  assert.equal(ui.state[0], 0);
});
