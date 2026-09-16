import { readFileSync, mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { parseEnv } from "node:util";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";
import { validatePublicFirebaseEnv } from "./validate-public-build-env.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const requiredKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "NEXT_PUBLIC_SITE_URL",
];

export function cloudBuildFlags(values) {
  validatePublicFirebaseEnv(values);
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

export function parseBuildOptions(args) {
  const options = { check: false, envFile: resolve(root, ".env.prod"), imageFile: null };
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "--check") options.check = true;
    else if (arg === "--env-file" || arg === "--image-file") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error(`Missing path after ${arg}`);
      options[arg === "--env-file" ? "envFile" : "imageFile"] = resolve(value);
    } else throw new Error(`Unknown option: ${arg}`);
  }
  if (options.envFile === options.imageFile) throw new Error("Image output must not overwrite the environment file");
  return options;
}

export function builtImageReference(build) {
  const image = build?.results?.images?.[0];
  if (build?.status !== "SUCCESS" || !image?.name || !/^sha256:[a-f0-9]{64}$/.test(image.digest || "")) {
    throw new Error("Cloud Build did not return a successful image digest; deployment must not proceed");
  }
  return `${image.name}@${image.digest}`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  let tempDirectory;
  try {
    const options = parseBuildOptions(process.argv.slice(2));
    const values = parseEnv(readFileSync(options.envFile, "utf8"));
    const flags = cloudBuildFlags(values);
    if (options.check) {
      console.log("Environment file contains all required public Cloud Build settings. No build submitted.");
    } else {
      // Keep the flags outside the uploaded source. This file contains only
      // explicitly approved browser settings, never runtime credentials.
      tempDirectory = mkdtempSync(join(tmpdir(), "urocms-cloud-build-"));
      const flagsFile = join(tempDirectory, "flags.json");
      writeFileSync(flagsFile, JSON.stringify(flags), { mode: 0o600 });
      const args = ["builds", "submit", root, `--flags-file=${flagsFile}`];
      if (options.imageFile) args.push("--suppress-logs", "--format=json");
      const result = spawnSync("gcloud", args, {
        cwd: root, stdio: options.imageFile ? ["inherit", "pipe", "inherit"] : "inherit", shell: false,
        encoding: "utf8", maxBuffer: 10 * 1024 * 1024,
      });
      if (result.error) throw new Error("Could not run gcloud. Run this command in Google Cloud Shell with Node.js 20.12+.");
      process.exitCode = result.status ?? 1;
      if (options.imageFile && result.status === 0) {
        const image = builtImageReference(JSON.parse(result.stdout));
        writeFileSync(options.imageFile, `${image}\n`, { mode: 0o600 });
        console.log("Cloud Build succeeded. Exact image digest written to the requested image file.");
      }
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Cloud Build failed");
    process.exitCode = 1;
  } finally {
    if (tempDirectory) rmSync(tempDirectory, { recursive: true, force: true });
  }
}
