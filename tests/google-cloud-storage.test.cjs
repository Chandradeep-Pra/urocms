const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

test('bucket resolution retries after failure and caches success', async () => {
  let calls = 0;
  const bucket = { exists: async () => [++calls > 1] };
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync('lib/server/googleCloudStorage.ts', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  vm.runInNewContext(code, {
    exports,
    process: { env: {
      GOOGLE_CLOUD_STORAGE_BUCKET: 'gs://video-bucket/',
      GOOGLE_APPLICATION_CREDENTIALS_JSON: JSON.stringify({
        project_id: 'project', client_email: 'test@example.test', private_key: 'test',
      }),
    } },
    require: name => name === '@google-cloud/storage' ? {
      Storage: class { bucket(name) { assert.equal(name, 'video-bucket'); return bucket; } },
    } : { normalizePrivateKey: value => value },
  });
  await assert.rejects(exports.getResolvedGoogleCloudStorageBucket(), /does not exist: video-bucket/);
  assert.equal(await exports.getResolvedGoogleCloudStorageBucket(), bucket);
  assert.equal(await exports.getResolvedGoogleCloudStorageBucket(), bucket);
  assert.equal(calls, 2);
});
