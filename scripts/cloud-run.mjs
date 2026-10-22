import { readFileSync, mkdtempSync, rmSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { tmpdir } from "node:os";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { validatePublicFirebaseEnv } from "./validate-public-build-env.mjs";
import { cloudBuildFlags } from "./cloud-build.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const defaultImage = "urologics-web:local";
const project = "proud-woods-489814-s6";
const region = "asia-south1";
const service = "urologics-web";
const usage = "Usage: node scripts/cloud-run.mjs deploy [--env-file PATH] [--check] | <build|run> [image]";
const publicBuildKeys = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_SITE_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_USER_APP_URL",
  "NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME",
];

export function dockerInvocation(mode, values, image = defaultImage, inherited = process.env) {
  // Never inherit values from the production file into the build process.
  const env = { ...inherited };
  for (const key of Object.keys(values)) delete env[key];

  if (mode === "build") {
    validatePublicFirebaseEnv(values);
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
  throw new Error(usage);
}

export function parseDeployOptions(args) {
  const options = { envFile: resolve(root, ".env.prod"), check: false };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--check") options.check = true;
    else if (args[i] === "--env-file") {
      const value = args[++i];
      if (!value || value.startsWith("--")) throw new Error("Missing path after --env-file");
      options.envFile = resolve(value);
    } else throw new Error(`Unknown deploy option: ${args[i]}`);
  }
  return options;
}

export function deployLatestImage(options, { run = spawnSync, log = console.log } = {}) {
  const values = parseEnv(readFileSync(options.envFile, "utf8"));
  cloudBuildFlags(values);
  if (options.check) {
    log(`Public build settings validated. Would build and deploy to ${service} (${project}, ${region}). No cloud changes made.`);
    return;
  }

  // Always use a new output file, so a failed build cannot reuse an older image.
  const workDir = mkdtempSync(join(tmpdir(), "urocms-cloud-run-"));
  const imageFile = join(workDir, "image.txt");
  const execute = (command, args, stage) => {
    const result = run(command, args, { cwd: root, stdio: "inherit", shell: false });
    if (result.error) throw new Error(`${stage}: could not start ${command}. Use an authenticated gcloud CLI in Cloud Shell.`);
    if (result.status !== 0) throw new Error(`${stage} failed (${result.signal || result.status || "unknown status"}).`);
  };
  try {
    log("Building and pushing a fresh image with Cloud Build...");
    execute(process.execPath, [resolve(root, "scripts/cloud-build.mjs"), "--env-file", options.envFile, "--image-file", imageFile], "Cloud Build");
    const image = readFileSync(imageFile, "utf8").trim();
    const prefix = `${region}-docker.pkg.dev/${project}/cloud-run-source-deploy/${service}:`;
    if (!image.startsWith(prefix) || !/^[^\s@]+@sha256:[a-f0-9]{64}$/.test(image)) {
      throw new Error("Cloud Build did not return the expected immutable image reference; deployment stopped.");
    }

    const suffix = `r${Date.now()}-${randomBytes(3).toString("hex")}`;
    const revision = `${service}-${suffix}`;
    const target = ["--project", project, "--region", region, "--quiet"];
    log(`Deploying ${image} to Cloud Run...`);
    // Image-only update: keep deployed environment variables, secrets, IAM,
    // resources, scaling, service account, and network configuration intact.
    execute("gcloud", ["run", "deploy", service, "--image", image, "--revision-suffix", suffix, ...target], "Cloud Run deployment");
    // Explicitly select our revision even if the service previously pinned traffic.
    execute("gcloud", ["run", "services", "update-traffic", service, "--to-revisions", `${revision}=100`, ...target], "Traffic update");
    execute("gcloud", ["run", "services", "describe", service, ...target, "--format=yaml(status.latestReadyRevisionName,status.traffic,status.url)"], "Deployment status");
    log(`Deployment completed: ${revision} receives 100% of traffic.`);
    return { image, revision };
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    const mode = process.argv[2];
    if (mode === "deploy") {
      deployLatestImage(parseDeployOptions(process.argv.slice(3)));
    } else {
      if (mode !== "build" && mode !== "run") throw new Error(usage);
      const values = parseEnv(readFileSync(resolve(root, ".env.prod"), "utf8"));
      const { args, env } = dockerInvocation(mode, values, process.argv[3]);
      const result = spawnSync("docker", args, { cwd: root, env, stdio: "inherit", shell: false });
      if (result.error) throw new Error("Could not start Docker. Check that Docker is installed and running.");
      process.exitCode = result.status ?? 1;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Cloud Run command failed");
    process.exitCode = 1;
  }
}
