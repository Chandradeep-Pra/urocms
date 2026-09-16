import test from "node:test";
import assert from "node:assert/strict";
import { cloudBuildFlags, parseBuildOptions, builtImageReference } from "../scripts/cloud-build.mjs";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const values = {
  NEXT_PUBLIC_FIREBASE_API_KEY: "browser-key",
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: "urologics.firebaseapp.com",
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: "urologics",
  NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME: "cloud",
  NEXT_PUBLIC_SITE_URL: "https://urologics.co.uk",
  GOOGLE_APPLICATION_CREDENTIALS_JSON: "private-credentials",
  FIREBASE_PRIVATE_KEY: "private-key",
  NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS: "private-allowlist",
};

test("Cloud Build uses only approved public env values and preserves Firebase project", () => {
  const flags = cloudBuildFlags(values);
  assert.equal(flags["--project"], "proud-woods-489814-s6");
  assert.equal(flags["--substitutions"]._NEXT_PUBLIC_FIREBASE_PROJECT_ID, "urologics");
  assert.equal(flags["--substitutions"]._NEXT_PUBLIC_FIREBASE_API_KEY, "browser-key");
  assert.equal(flags["--substitutions"]._NEXT_PUBLIC_APP_URL, "");
  assert.equal(Object.keys(flags["--substitutions"]).length, 7);
  assert.ok(!JSON.stringify(flags).includes("private-"));
});

test("missing Firebase browser key stops submission early", () => {
  assert.throws(() => cloudBuildFlags({ ...values, NEXT_PUBLIC_FIREBASE_API_KEY: " " }), /NEXT_PUBLIC_FIREBASE_API_KEY/);
});

test("build helper accepts an external env file and separate image output", () => {
  const options = parseBuildOptions(["--env-file", "home/.env.prod", "--image-file", "image.txt", "--check"]);
  assert.equal(options.envFile, resolve("home/.env.prod"));
  assert.equal(options.imageFile, resolve("image.txt"));
  assert.equal(options.check, true);
  assert.throws(() => parseBuildOptions(["--env-file"]), /Missing path/);
  assert.throws(() => parseBuildOptions(["--env-file", "same", "--image-file", "same"]), /overwrite/);
});

test("only a successful build can provide the exact image for deployment", () => {
  const digest = `sha256:${"a".repeat(64)}`;
  const build = { status: "SUCCESS", results: { images: [{ name: "registry/project/image:build-id", digest }] } };
  assert.equal(builtImageReference(build), `registry/project/image:build-id@${digest}`);
  assert.throws(() => builtImageReference({ ...build, status: "FAILURE" }), /must not proceed/);
  assert.throws(() => builtImageReference({ status: "SUCCESS" }), /must not proceed/);
});

test("Cloud Shell deployment passes build config and deploys the built image, not source", () => {
  const script = readFileSync(new URL("../scripts/deploy-cloud-shell.sh", import.meta.url), "utf8");
  assert.match(script, /set -euo pipefail/);
  assert.match(script, /--env-file "\$ENV_SOURCE" --image-file "\$IMAGE_FILE"/);
  assert.match(script, /--image "\$IMAGE"/);
  assert.doesNotMatch(script, /^\s+--source\b/m);
  assert.match(script, /--env-vars-file "\$RUNTIME_FILE"/);
  assert.doesNotMatch(script, /npm run build|writeFileSync\([^\n]*\.env\.production/);
});
