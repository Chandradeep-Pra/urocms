import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "node:util";
import { mkdtempSync, writeFileSync, existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { dockerInvocation, parseDeployOptions, deployLatestImage } from "../scripts/cloud-run.mjs";

const values = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "public-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "example.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "example",
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "example-cloud",
  FIREBASE_PRIVATE_KEY: "private\nkey",
  UNKNOWN_SECRET: "secret-value",
  ADMIN_ALLOWED_EMAILS: "admin@example.com",
  NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS: "admin@example.com",
};

test("build forwards only approved public configuration and targets amd64", () => {
  const { args, env } = dockerInvocation("build", values, "example:local", { ...values, PATH: "tools" });
  assert.ok(args.includes("linux/amd64"));
  assert.ok(args.includes("NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME"));
  assert.equal(env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME, "example-cloud");
  assert.equal(env.FIREBASE_PRIVATE_KEY, undefined);
  assert.equal(env.UNKNOWN_SECRET, undefined);
  assert.equal(env.ADMIN_ALLOWED_EMAILS, undefined);
  assert.equal(env.NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS, undefined);
  assert.ok(!args.some((arg) => arg.includes("ADMIN_ALLOWED_EMAILS")));
  assert.equal(env.PATH, "tools");
  assert.ok(!args.some((arg) => arg.includes("secret-value") || arg.includes("PRIVATE_KEY")));
});

test("runtime preserves dotenv multiline secrets without putting values on argv", () => {
  const parsed = parseEnv('FIREBASE_PRIVATE_KEY="line one\nline two"\nPORT=1234');
  const { args, env } = dockerInvocation("run", parsed, "example:local", {});
  assert.equal(env.FIREBASE_PRIVATE_KEY, "line one\nline two");
  assert.ok(args.includes("FIREBASE_PRIVATE_KEY"));
  assert.ok(!args.some((arg) => arg.includes("line one")));
  assert.ok(args.includes("PORT=8080"));
  assert.ok(args.includes("HOSTNAME=0.0.0.0"));
  assert.ok(args.includes("NODE_ENV=production"));
});

test("build fails clearly when required public configuration is missing", () => {
  assert.throws(() => dockerInvocation("build", {}, "example:local", {}), /Missing public build setting/);
});

function deploymentFixture(t) {
  const directory = mkdtempSync(join(tmpdir(), "urocms-deploy-test-"));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const envFile = join(directory, "settings.env");
  writeFileSync(envFile, Object.entries({ ...values, NEXT_PUBLIC_SITE_URL: "https://example.test" })
    .map(([key, value]) => `${key}=${JSON.stringify(value)}`).join("\n"));
  const image = `asia-south1-docker.pkg.dev/proud-woods-489814-s6/cloud-run-source-deploy/urologics-web:build-123@sha256:${"a".repeat(64)}`;
  const calls = [];
  let imageFile;
  const run = (command, args, options) => {
    calls.push({ command, args, options });
    if (command === process.execPath) {
      imageFile = args[args.indexOf("--image-file") + 1];
      writeFileSync(imageFile, `${image}\n`);
    }
    return { status: 0 };
  };
  return { envFile, image, calls, run, imageFile: () => imageFile };
}

test("deploy accepts an environment file and a validation-only mode", () => {
  assert.deepEqual(parseDeployOptions(["--env-file", "settings.env", "--check"]), {
    envFile: resolve("settings.env"), check: true,
  });
  assert.throws(() => parseDeployOptions(["--env-file"]), /Missing path/);
  assert.throws(() => parseDeployOptions(["--image", "stale:latest"]), /Unknown deploy option/);
});

test("deploy builds first, deploys that exact digest and routes traffic to its own revision", t => {
  const f = deploymentFixture(t);
  const result = deployLatestImage({ envFile: f.envFile }, { run: f.run, log() {} });
  assert.equal(f.calls.length, 4);
  assert.equal(f.calls[0].command, process.execPath);
  assert.ok(f.calls[0].args[0].endsWith("cloud-build.mjs"));
  assert.equal(f.calls[0].args[2], f.envFile);
  assert.equal(result.image, f.image);
  const deploy = f.calls[1].args;
  assert.deepEqual(deploy.slice(0, 3), ["run", "deploy", "urologics-web"]);
  assert.equal(deploy[deploy.indexOf("--image") + 1], f.image);
  const suffix = deploy[deploy.indexOf("--revision-suffix") + 1];
  assert.equal(result.revision, `urologics-web-${suffix}`);
  assert.ok(f.calls[2].args.includes(`${result.revision}=100`));
  assert.deepEqual(f.calls[3].args.slice(0, 3), ["run", "services", "describe"]);
  for (const call of f.calls.slice(1)) {
    assert.equal(call.command, "gcloud");
    assert.ok(call.args.includes("proud-woods-489814-s6"));
    assert.ok(call.args.includes("asia-south1"));
    assert.equal(call.options.shell, false);
    assert.ok(!call.args.some(arg => /--(?:source|env-vars|set-env|update-env|set-secrets|allow-unauthenticated|cpu|memory)/.test(arg)));
    assert.ok(!call.args.some(arg => arg.includes("secret-value") || arg.includes("private")));
  }
  assert.equal(existsSync(f.imageFile()), false);
});

test("validation-only mode makes no build or deployment calls", t => {
  const f = deploymentFixture(t);
  deployLatestImage({ envFile: f.envFile, check: true }, { run: f.run, log() {} });
  assert.equal(f.calls.length, 0);
});

test("a failed build or deployment stops later steps and cleans up its image output", t => {
  for (const failedStep of [0, 1, 2, 3]) {
    const f = deploymentFixture(t);
    const run = (...args) => {
      const result = f.run(...args);
      return f.calls.length - 1 === failedStep ? { status: 1 } : result;
    };
    assert.throws(() => deployLatestImage({ envFile: f.envFile }, { run, log() {} }), /failed/);
    assert.equal(f.calls.length, failedStep + 1);
    assert.equal(existsSync(f.imageFile()), false);
  }
});

test("a mutable or unrelated image reference cannot be deployed", t => {
  for (const image of ["registry/image:latest", `other/image@sha256:${"b".repeat(64)}`]) {
    const f = deploymentFixture(t);
    const run = (...args) => {
      const result = f.run(...args);
      writeFileSync(f.imageFile(), image);
      return result;
    };
    assert.throws(() => deployLatestImage({ envFile: f.envFile }, { run, log() {} }), /immutable image reference/);
    assert.equal(f.calls.length, 1);
    assert.equal(existsSync(f.imageFile()), false);
  }
});
