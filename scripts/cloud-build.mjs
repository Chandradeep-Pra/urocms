import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { parseEnv } from "node:util";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = fileURLToPath(new URL("../", import.meta.url));
const requiredKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "NEXT_PUBLIC_SITE_URL",
];

export function cloudBuildFlags(values) {
  for (const key of requiredKeys) {
    if (!values[key]?.trim()) throw new Error(`Missing public build setting in .env.prod: ${key}`);
  }
  const keys = [...requiredKeys, "NEXT_PUBLIC_APP_URL", "NEXT_PUBLIC_USER_APP_URL"];
  return {
    "--project": "proud-woods-489814-s6",
    "--region": "asia-south1",
    "--config": resolve(root, "cloudbuild.yaml"),
    "--substitutions": Object.fromEntries(keys.map(key => [`_${key}`, values[key] || ""])),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let tempDirectory;
  try {
    const values = parseEnv(readFileSync(resolve(root, ".env.prod"), "utf8"));
    const flags = cloudBuildFlags(values);
    if (process.argv.includes("--check")) {
      console.log(".env.prod contains all required public Cloud Build settings. No build submitted.");
    } else {
      // Keep the flags outside the uploaded source. This file contains only
      // explicitly approved browser settings, never runtime credentials.
      tempDirectory = mkdtempSync(join(tmpdir(), "urocms-cloud-build-"));
      const flagsFile = join(tempDirectory, "flags.json");
      writeFileSync(flagsFile, JSON.stringify(flags), { mode: 0o600 });
      const result = spawnSync("gcloud", ["builds", "submit", root, `--flags-file=${flagsFile}`], {
        cwd: root, stdio: "inherit", shell: false,
      });
      if (result.error) throw new Error("Could not run gcloud. Run this command in Google Cloud Shell with Node.js 20.12+.");
      process.exitCode = result.status ?? 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Cloud Build failed");
    process.exitCode = 1;
  } finally {
    if (tempDirectory) rmSync(tempDirectory, { recursive: true, force: true });
  }
}
