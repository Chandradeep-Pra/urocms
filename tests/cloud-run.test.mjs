import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEnv } from "node:util";
import { dockerInvocation } from "../scripts/cloud-run.mjs";

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
