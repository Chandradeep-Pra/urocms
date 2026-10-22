import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as crypto from 'node:crypto';
import ts from 'typescript';
import * as React from 'react';
import * as jsxRuntime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import * as clsx from 'clsx';
import * as tailwindMerge from 'tailwind-merge';

function load(file, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX, esModuleInterop: true },
  }).outputText;
  vm.runInNewContext(code, { exports, Date, console, require: name => {
    if (!(name in modules)) throw new Error(`Unexpected import ${name}`);
    return modules[name];
  } });
  return exports;
}
const helpers = load('lib/server/mockAttempts.ts');
const tracking = load('lib/server/mockAttemptTracking.ts', { 'node:crypto': crypto, '@/lib/server/mockAttempts': helpers });
const candidate = { uid: 'student', name: 'Candidate', email: 'student@example.test' };
const first = { candidate, marks: 3, createdAt: '2026-10-01T10:00:00Z' };
const later = { candidate, marks: 8, createdAt: '2026-10-02T10:00:00Z' };
const rows = (originals, submissions = []) => Array.from(tracking.summarizeMockCompletions(originals, submissions));

test('admin joins archived scores and matching private timing without counting copies twice', () => {
  const [row] = rows([first, later, { ...first }, { candidate, score: 3, submittedAt: first.createdAt, timeTakenSeconds: 65 }, { ...later, timeTakenSeconds: 120 }]);
  assert.equal(row.marks, 3);
  assert.equal(row.totalAttempts, 2);
  assert.equal(row.timeTakenSeconds, 185);
  assert.equal(row.timedAttempts, 2);
});

test('missing time stays unknown, zero is valid, and incomplete historical totals stay explicit', () => {
  const [unknown] = rows([first]);
  assert.equal(unknown.timeTakenSeconds, null);
  assert.equal(unknown.timedAttempts, 0);
  const [partial] = rows([{ ...first, attemptNumber: 3, timeTakenSeconds: 0 }], [
    { ...later, id: 'retake', timeTakenSeconds: 60, isFirstAttempt: false },
  ]);
  assert.equal(partial.totalAttempts, 4);
  assert.equal(partial.timedAttempts, 2);
  assert.equal(partial.timeTakenSeconds, 60);
});

test('completion logs track retakes and merge a tracked first attempt with its legacy/private copy', () => {
  const [row] = rows([first], [
    { ...first, id: 'original', isFirstAttempt: true, timeTakenSeconds: 90 },
    { ...later, id: 'retake', isFirstAttempt: false, timeTakenSeconds: 120 },
  ]);
  assert.equal(row.totalAttempts, 2);
  assert.equal(row.timeTakenSeconds, 210);
  assert.equal(row.marks, 3);
});

test('separate submission IDs count as two completions even when their timestamps match', () => {
  const [row] = rows([first], [
    { ...first, id: 'one', isFirstAttempt: true, timeTakenSeconds: 60 },
    { ...first, id: 'two', isFirstAttempt: false, timeTakenSeconds: 60 },
  ]);
  assert.equal(row.totalAttempts, 2);
  assert.equal(row.timeTakenSeconds, 120);
});

test('a legacy private copy of a later attempt cannot assign its time to the archived first score', () => {
  const [row] = rows([first, { ...later, timeTakenSeconds: 120 }], [
    { ...later, id: 'legacy-retry', isFirstAttempt: true, originalSubmittedAt: later.createdAt, timeTakenSeconds: 120 },
  ]);
  assert.equal(row.totalAttempts, 2);
  assert.equal(row.timedAttempts, 1);
  assert.equal(row.timeTakenSeconds, 120);
  assert.equal(row.marks, 3);
});

test('stable submission IDs distinguish identical retakes and fingerprints deduplicate legacy retries', () => {
  const input = { marks: 3, totalQuestions: 10, timeTakenSeconds: 65, answers: { q2: 1, q1: 0 } };
  const a = tracking.createMockCompletion(candidate, input, first.createdAt);
  const retry = tracking.createMockCompletion({ ...candidate, email: ' STUDENT@example.test ' }, { ...input, answers: { q1: 0, q2: 1 } }, later.createdAt);
  assert.equal(a.id, retry.id);
  assert.notEqual(a.id, tracking.createMockCompletion(candidate, { ...input, timeTakenSeconds: 66 }, later.createdAt).id);
  const one = tracking.createMockCompletion(candidate, { ...input, submissionId: 'run-one' }, first.createdAt);
  const two = tracking.createMockCompletion(candidate, { ...input, submissionId: 'run-two' }, later.createdAt);
  assert.notEqual(one.id, two.id);
  assert.equal(tracking.isOriginalMockCompletion(one.id, one.record, { completionKey: one.id }), true);
  assert.equal(tracking.isOriginalMockCompletion(two.id, two.record, { completionKey: one.id }), false);
  assert.equal(tracking.isOriginalMockCompletion(a.id, a.record, { ...input, score: 3 }), true);
  assert.equal('answers' in a.record, false);
});

test('timing validation does not turn missing, negative, or nonfinite values into zero minutes', () => {
  for (const value of [null, undefined, '', -1, NaN, Infinity]) assert.equal(tracking.recordedMockSeconds(value), null);
  assert.equal(tracking.recordedMockSeconds(0), 0);
});

test('admin report resolves canonical student IDs and reads only the selected mock timing', async () => {
  const reads = [];
  const canonical = { ...candidate, uid: undefined };
  const db = { collection(name) {
    if (name === 'users') return { where: (_, __, emails) => {
      assert.deepEqual(Array.from(emails), [candidate.email]);
      return { select: () => ({ get: async () => ({ docs: [{ id: 'shadow', data: () => ({ email: candidate.email, isShadowDuplicate: true }) }, { id: 'student', data: () => ({ email: candidate.email, canonicalUserId: 'student' }) }] }) }) };
    } };
    return { doc(id) { return { collection(sub) {
      if (name === 'mocks') {
        assert.deepEqual([id, sub], ['mock-one', 'submissions']);
        return { get: async () => ({ docs: [] }) };
      }
      assert.deepEqual([name, id, sub], ['mockAttempts', 'student', 'items']);
      return { where(field, op, value) {
        reads.push([field, op, value]);
        return { get: async () => ({ docs: [{ data: () => ({ mockId: 'mock-one', score: 3, submittedAt: first.createdAt, timeTakenSeconds: 300 }) }] }) };
      } };
    } }; } };
  } };
  const service = load('lib/server/adminMockAttempts.ts', {
    '@/lib/firebaseAdmin': { getAdminDb: () => db, getAdminAuth: () => { throw new Error('Canonical profile already resolved'); } },
    '@/lib/server/mockAttemptTracking': tracking,
  });
  const result = await service.getAdminMockAttemptRows('mock-one', { attempts: [{ ...first, candidate: canonical }] });
  assert.equal(result[0].totalAttempts, 1);
  assert.equal(result[0].timeTakenSeconds, 300);
  assert.deepEqual(reads, [['mockId', '==', 'mock-one']]);
});

test('admin report is unavailable without an admin session and returns uncached rows when authorized', async () => {
  let authorized = false;
  let reads = 0;
  const route = load('app/api/mocks/[id]/route.ts', {
    'next/server': { NextResponse: { json: (body, options) => ({ body, ...options }) } },
    '@/lib/server/adminAccess': { requireAdminSession: async () => ({ response: authorized ? null : { status: 401 } }) },
    '@/lib/server/mockService': { getMockDetails: async () => { reads++; return { id: 'mock-one' }; } },
    '@/lib/server/adminMockAttempts': { getAdminMockAttemptRows: async () => rows([first]) },
  });
  const context = { params: Promise.resolve({ id: 'mock-one' }) };
  assert.equal((await route.GET({}, context)).status, 401);
  assert.equal(reads, 0);
  authorized = true;
  const response = await route.GET({}, context);
  assert.equal(response.body.mock.attemptRows[0].totalAttempts, 1);
  assert.equal(response.headers['Cache-Control'], 'private, no-store');
});

test('table shows the requested columns, minute/second durations, missing timing, and empty state', () => {
  const utils = load('lib/utils.ts', { clsx, 'tailwind-merge': tailwindMerge });
  const table = load('components/ui/table.tsx', { react: React, 'react/jsx-runtime': jsxRuntime, '@/lib/utils': utils });
  const Component = load('components/dashboard/MockAttemptsTable.tsx', { 'react/jsx-runtime': jsxRuntime, '@/components/ui/table': table }).default;
  const render = data => renderToStaticMarkup(React.createElement(Component, { rows: data }));
  const html = render(rows([first, { ...later, timeTakenSeconds: 125 }]));
  for (const title of ['Name', 'Email', 'Marks', 'Time spent', 'Total attempts']) assert.ok(html.includes(`>${title}</th>`));
  assert.match(html, /2m 5s/);
  assert.match(html, /1 of 2 attempts timed/);
  assert.match(render(rows([first])), /Not recorded/);
  assert.match(render([]), /No attempts recorded yet/);
});
