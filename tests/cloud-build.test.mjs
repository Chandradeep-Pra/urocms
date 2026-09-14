import test from "node:test";
import assert from "node:assert/strict";
import { cloudBuildFlags } from "../scripts/cloud-build.mjs";

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
