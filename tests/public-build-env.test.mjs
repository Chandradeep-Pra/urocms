import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { validatePublicFirebaseEnv } from "../scripts/validate-public-build-env.mjs";
import { cloudBuildFlags } from "../scripts/cloud-build.mjs";
import { dockerInvocation } from "../scripts/cloud-run.mjs";

const values = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "test-public-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "project.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "project",
};

test("Docker Firebase validation succeeds without any server credentials", () => {
  assert.doesNotThrow(() => validatePublicFirebaseEnv(values));
});

test("missing or blank values fail with the variable name, not another value", () => {
  for (const name of Object.keys(values)) {
    for (const value of [undefined, "", "   "]) {
      assert.throws(() => validatePublicFirebaseEnv({ ...values, [name]: value }), error => {
        assert.ok(error.message.includes(name));
        assert.ok(error.message.includes("Docker build argument"));
        assert.ok(!error.message.includes("test-public-key"));
        return true;
      });
    }
  }
});

test("unresolved substitutions and whitespace are rejected by both build paths", () => {
  for (const value of ["${_NEXT_PUBLIC_FIREBASE_API_KEY}", "$_NEXT_PUBLIC_FIREBASE_API_KEY", " test-public-key ", "test\nkey"]) {
    const invalid = { ...values, NEXT_PUBLIC_FIREBASE_API_KEY: value };
    assert.throws(() => cloudBuildFlags(invalid), /Invalid public build setting: NEXT_PUBLIC_FIREBASE_API_KEY/);
    assert.throws(() => dockerInvocation("build", invalid), /Invalid public build setting: NEXT_PUBLIC_FIREBASE_API_KEY/);
  }
});

test("Docker validates the actual build environment before running Next.js", () => {
  const dockerfile = readFileSync(new URL("../Dockerfile", import.meta.url), "utf8");
  assert.match(dockerfile, /RUN node scripts\/validate-public-build-env\.mjs && npm run build/);
  const env = { ...process.env, ...values, NEXT_PUBLIC_FIREBASE_API_KEY: "" };
  const result = spawnSync(process.execPath, ["scripts/validate-public-build-env.mjs"], { env, encoding: "utf8" });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing public build setting: NEXT_PUBLIC_FIREBASE_API_KEY/);
  assert.doesNotMatch(result.stderr, /test-public-key/);
});
