/* eslint-disable @typescript-eslint/no-require-imports */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(code, { exports, URL, URLSearchParams, process: { env: {} }, require: name => modules[name] });
  return exports;
}
const page = load('app/login/page.tsx', {
  '@/components/auth/LoginPanel': { default: function LoginPanel() {} },
  'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
  'next/navigation': { redirect: location => { throw Object.assign(new Error('Redirect'), { location }); } },
});

test('bare login redirects to an explicit login tab while preserving the return destination', async () => {
  await assert.rejects(page.default({ searchParams: Promise.resolve({ next: '/dashboard/settings' }) }), error => {
    const location = new URL(error.location, 'https://urologics.co.uk');
    return location.pathname === '/login' && location.searchParams.get('mode') === 'login' && location.searchParams.get('next') === '/dashboard/settings';
  });
});
test('both explicit account tabs render the same shared panel', async () => {
  const login = await page.default({ searchParams: Promise.resolve({ mode: 'login' }) });
  const signup = await page.default({ searchParams: Promise.resolve({ mode: 'signup' }) });
  assert.equal(login.type, signup.type);
  assert.equal(login.props.initialMode, 'login');
  assert.equal(signup.props.initialMode, 'signup');
});

if (fs.existsSync('../testing-zone/lib/main-login.ts')) {
  const paths = load('../testing-zone/lib/app-path.ts', {});
  const { mainLoginUrl } = load('../testing-zone/lib/main-login.ts', {
    '@/lib/app-path': paths,
    '@/lib/urologics-api': { getUrologicsApiUrl: path => `https://urologics.co.uk${path}` },
  });
  test('legacy Testing Zone login selects the current login tab and preserves course destinations', () => {
    const location = new URL(mainLoginUrl('/web/courses?topic=renal'));
    assert.equal(location.pathname, '/login');
    assert.equal(location.searchParams.get('mode'), 'login');
    assert.equal(location.searchParams.get('redirect'), '/web/courses?topic=renal');
  });
  test('legacy login avoids login loops and rejects external return destinations', () => {
    for (const destination of [null, '//evil.test', 'https://evil.test', '/web/login', '/login?mode=login']) {
      const location = new URL(mainLoginUrl(destination));
      assert.equal(location.origin, 'https://urologics.co.uk');
      assert.equal(location.searchParams.get('redirect'), '/web');
    }
    assert.equal(new URL(mainLoginUrl(null, true)).searchParams.get('mode'), 'signup');
  });
}
