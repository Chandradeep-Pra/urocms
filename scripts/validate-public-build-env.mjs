import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

export function validatePublicFirebaseEnv(values) {
  for (const name of [
    "NEXT_PUBLIC_FIREBASE_API_KEY",
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  ]) {
    const value = values[name];
    if (typeof value !== "string" || !value.trim()) {
      throw new Error(`Missing public build setting: ${name}. Pass it as a Docker build argument before next build; Cloud Run runtime variables are too late. Use node scripts/cloud-build.mjs to submit with .env.prod settings.`);
    }
    if (value !== value.trim() || /\$\{|^\$_|[\r\n]/.test(value)) {
      throw new Error(`Invalid public build setting: ${name}. Remove surrounding whitespace and resolve Cloud Build substitutions. No configuration values are logged.`);
    }
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    validatePublicFirebaseEnv(process.env);
    console.log("Public Firebase build settings are present. Values are not logged.");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Public build configuration is invalid");
    process.exitCode = 1;
  }
}
