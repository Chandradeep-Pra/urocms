const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
function load(file, modules = {}) {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText;
  vm.runInNewContext(code, { exports, File, Buffer, console, require: name => { if (!(name in modules)) throw new Error(`Unexpected import: ${name}`); return modules[name]; } });
  return exports;
}
const { validateSignup, emptySignup } = load('lib/signupValidation.ts');
test('signup identifies every missing required field, including country', () => {
  const errors = validateSignup(emptySignup);
  assert.equal(Object.keys(errors).length, 7);
  assert.equal(errors.countryValue, 'Select your country.');
  assert.equal(errors.medicalInstitution, 'Enter your medical institution.');
});
test('signup accepts valid details and identifies mismatched passwords', () => {
  const values = { name: 'Test Candidate', email: 'test@example.test', password: 'secret123', confirmPassword: 'secret123', countryValue: 'India-+91', phone: '9876543210', medicalInstitution: 'Test Hospital' };
  assert.equal(Object.keys(validateSignup(values)).length, 0);
  assert.equal(validateSignup({ ...values, confirmPassword: 'different' }).confirmPassword, 'Passwords do not match.');
  assert.equal(validateSignup({ ...values, email: 'invalid' }).email, 'Enter a valid email address.');
});

function uploadFixture(authorized = true) {
  const calls = [];
  const denial = { status: 401 };
  const route = load('app/api/app/profile/image/route.ts', {
    'next/server': { NextResponse: { json: (data, options = {}) => ({ data, status: options.status || 200 }) } },
    '@/lib/server/appSession': { requireAppUser: async () => authorized ? { user: { uid: 'candidate-id' } } : { response: denial } },
    '@/lib/server/cloudinaryService': { uploadBase64ToCloudinary: async (...args) => { calls.push(args); return { url: 'https://example.test/profile.png' }; } },
  });
  return { calls, route, denial };
}
test('profile upload rejects anonymous access before reading the file', async () => {
  const f = uploadFixture(false);
  assert.equal(await f.route.POST({ formData: () => { throw new Error('Must not read'); } }), f.denial);
  assert.equal(f.calls.length, 0);
});
test('profile upload rejects unsupported and oversized files', async () => {
  const f = uploadFixture();
  for (const file of [new File(['text'], 'text.txt', { type: 'text/plain' }), new File([new Uint8Array(5 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })]) {
    const response = await f.route.POST({ formData: async () => ({ get: () => file }) });
    assert.equal(response.status, 400);
  }
  assert.equal(f.calls.length, 0);
});
test('profile upload uses Cloudinary in the authenticated candidate folder', async () => {
  const f = uploadFixture();
  const response = await f.route.POST({ formData: async () => ({ get: () => new File(['png'], 'photo.png', { type: 'image/png' }) }) });
  assert.equal(response.status, 200);
  assert.equal(response.data.url, 'https://example.test/profile.png');
  assert.equal(f.calls[0][1], 'urologics-profile/candidate-id');
});
