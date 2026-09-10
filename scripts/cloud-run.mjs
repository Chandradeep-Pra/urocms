import { readFileSync } from "node:fs";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const defaultImage = "urologics-web:local";
const publicBuildKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_USER_APP_URL",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
  "NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS",
];

export function dockerInvocation(mode, values, image = defaultImage, inherited = process.env) {
  // Never inherit values from the production file into the build process.
  const env = { ...inherited };
  for (const key of Object.keys(values)) delete env[key];

  if (mode === "build") {
    for (const key of [
      "NEXT_PUBLIC_FIREBASE_API_KEY",
      "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
      "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
      "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
    ]) {
      if (!values[key]?.trim()) throw new Error(`Missing public build setting: ${key}`);
    }
    const args = ["build", "--platform", "linux/amd64", "--tag", image];
    for (const key of publicBuildKeys) {
      if (values[key] !== undefined) {
        env[key] = values[key];
        args.push("--build-arg", key);
      }
    }
    args.push(".");
    return { args, env };
  }

  if (mode === "run") {
    const args = ["run", "--rm", "--name", "urologics-web-local", "--publish", "127.0.0.1:8080:8080"];
    for (const [key, value] of Object.entries(values)) {
      // Pass names on argv and values via the Docker client's environment.
      // This preserves dotenv quotes/multiline keys without creating a secret file.
      env[key] = value;
      args.push("--env", key);
    }
    args.push("--env", "NODE_ENV=production", "--env", "PORT=8080", "--env", "HOSTNAME=0.0.0.0", image);
    return { args, env };
  }
  throw new Error("Usage: node scripts/cloud-run.mjs <build|run> [image]");
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const values = parseEnv(readFileSync(resolve(root, ".env.prod"), "utf8"));
    const { args, env } = dockerInvocation(process.argv[2], values, process.argv[3]);
    const result = spawnSync("docker", args, { cwd: root, env, stdio: "inherit", shell: false });
    if (result.error) throw new Error("Could not start Docker. Check that Docker is installed and running.");
    process.exitCode = result.status ?? 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Docker command failed");
    process.exitCode = 1;
  }
}
