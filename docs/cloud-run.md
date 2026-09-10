# Cloud Run deployment

## Current target and local commands

Target project: `proud-woods-489814-s6`; service: `urologics-web`;
region: `asia-south1`; container port: `8080`.
These commands only build and run locally. They do not create Google Cloud
resources, push an image, or deploy a service.

From the repository root, with Docker Desktop running Linux containers:

```powershell
# Build a linux/amd64 image using only approved NEXT_PUBLIC values from .env.prod.
node scripts/cloud-run.mjs build urologics-web:local

# Run in the foreground, injecting .env.prod values only at runtime.
node scripts/cloud-run.mjs run urologics-web:local
```

In a second terminal:

```powershell
curl.exe --fail-with-body -i http://localhost:8080/api/health
curl.exe --fail --output NUL http://localhost:8080/
curl.exe --fail --output NUL http://localhost:8080/pricing
curl.exe --fail --output NUL http://localhost:8080/login
docker exec urologics-web-local id
docker image inspect urologics-web:local --format '{{.Os}}/{{.Architecture}} user={{.Config.User}}'
docker stop urologics-web-local
```

Expect HTTP 200 for health, status `ok`, a current ISO timestamp, version `0.1.0`,
and `Cache-Control: no-store`. `id` must report UID 1001; image inspection must
report `linux/amd64 user=nextjs`. Page requests use production services configured
in `.env.prod`; avoid submitting writes/payments while smoke testing locally.

The helper is equivalent to `docker build --platform linux/amd64` with one
`--build-arg NAME` per approved public setting, and `docker run --rm` with
runtime `--env NAME` flags. Values are passed in the Docker client's environment,
not embedded in command arguments. It binds the local published port to loopback.
It never copies or mounts `.env.prod` into the image or container. The runtime
process explicitly uses production mode, port 8080 and host 0.0.0.0.

Do not use `docker run --env-file .env.prod` for the current file: it has quoted,
multiline private keys that Docker's env-file parser does not interpret as dotenv.
The helper uses Node's dotenv parser and preserves these values correctly.
`.gitignore` already ignores `.env*`, and `.env.prod` is currently untracked;
no tracked environment file was removed or changed. `.dockerignore` explicitly
excludes `.env.prod`, `.env*`, and nested `.env*` files.

## Container

The existing `next.config.ts` already enables standalone output. Its external
packages are preserved. Firebase Hosting routes `/web` directly to the second Cloud Run service; there are no main-app `/web` rewrites. All existing pages and API handlers
are retained. The image starts the generated standalone `server.js` directly,
which reads `process.env.PORT` (image default: 8080) and `HOSTNAME=0.0.0.0`.
The runtime user is UID/GID 1001. Static assets and public files are included,
and `.next` is writable by that user for Next.js image/data caches.

The homepage, pricing page and its `/premium-explore` alias now render dynamically. Previously their 300/3600
second ISR caches could store empty Firebase results during a credential-free
build because data-loading errors are caught. Runtime rendering prevents that
deployment regression; it increases per-request database work. Their UI and
data-loading behavior are otherwise preserved.

No Node/npm version was pinned in package.json or a version file. The old image
used floating Node 20; this image pins the inspected development toolchain,
Node 24.11.0 and npm 11.18.0. npm installs with the existing v3 package lock.
Review base-image security updates regularly; production Linux validation is
still required before rollout.

## Build and secrets

Build with Docker BuildKit on a machine with a running Docker daemon. Example
(replace public values and image coordinates; command shown on one line):

```sh
docker build --platform linux/amd64 --build-arg NEXT_PUBLIC_FIREBASE_API_KEY=PUBLIC_FIREBASE_WEB_KEY --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=PROJECT.firebaseapp.com --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID=PROJECT --build-arg NEXT_PUBLIC_SITE_URL=https://YOUR_DOMAIN --build-arg NEXT_PUBLIC_USER_APP_URL=https://YOUR_DOMAIN/web -t REGION-docker.pkg.dev/PROJECT/REPOSITORY/urocms:VERSION .
```

Other supported public arguments: `NEXT_PUBLIC_APP_URL`,
`NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME`, `NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS`.
Prefer the server-only `ADMIN_ALLOWED_EMAILS` runtime variable for admin policy.
Public values are embedded during build; changing runtime variables cannot
replace them in browser bundles. Never pass server secrets as build arguments.
Build requires registry/npm access and Google Fonts access (`next/font/google`).

`.dockerignore` excludes all `.env` files (including examples), common credential
files and local tooling. Do not place credentials under arbitrary source or
public filenames: filename exclusions cannot recognize every possible secret.
No `.env` mount or credential is required by the Dockerfile. Do not copy local
`.next` output into the image; it may have been built with local configuration.

Inject server secrets using Cloud Run Secret Manager environment references:

- Firebase: `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY`,
  and `FIREBASE_STORAGE_BUCKET` as applicable. Firebase Admin currently requires
  explicit credentials; assigning a Cloud Run service account alone is insufficient.
- Storage/video: `GOOGLE_APPLICATION_CREDENTIALS_JSON`,
  `GOOGLE_CLOUD_STORAGE_BUCKET`; Drive uses
  `GOOGLE_SERVICE_ACCOUNT_CLIENT_EMAIL` and `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`
  or the Firebase credential fallback. Preserve the existing Drive folder/resource
  configuration. Verify bucket permissions and signed video URLs.
- Integrations: `GEMINI_API_KEY`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`,
  `EMAIL_USER`, `EMAIL_PASS`, `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`,
  `PAYPAL_MODE`, and `PAYMENT_QUERY_TASK_SECRET` for enabled features.
- Preserve other applicable settings such as `ADMIN_ALLOWED_EMAILS`, `TAX`,
  `GOOGLE_CLOUD_PROJECT`, `PAYMENT_QUERY_TASK_LOCATION`,
  `PAYMENT_QUERY_TASK_QUEUE`, and `PAYMENT_QUERY_TASK_URL`.

Set `NEXT_PUBLIC_SITE_URL` to the same canonical URL at runtime because some
server modules also use it. Grant the service identity Secret Manager access
only to the required secrets. Preserve integration access for the identities
named in the application's explicit credentials.

## Manual deployment and smoke checks

1. Enable Cloud Run and Artifact Registry, create a Docker repository, configure
   registry authentication, build the Linux image and push it with `docker push`.
2. Configure the runtime secrets/settings above and deploy that image to Cloud
   Run on port 8080. Start with a request timeout of at least 300 seconds; load
   test broadcasts, AI requests, video sync/streaming and tune memory/concurrency.
   Configure an HTTP startup probe at `/api/health` on port 8080. A liveness probe
   may use the same endpoint; it intentionally does not test external services.
3. This is a public website with application authentication. Make the service
   publicly invokable if preserving that access model. The existing Cloud Tasks
   callback sends a shared-secret header, not a Cloud Run IAM identity token;
   an IAM-private service would require a separate authenticated task integration.
4. Configure the existing Cloud Tasks queue and enqueuer permissions for the
   actual credential identity, then point `PAYMENT_QUERY_TASK_URL` to
   `https://YOUR_DOMAIN/api/internal/payment-query-followup`. Check task delivery
   and retry behavior before allowing live payment queries.
5. Map DNS/domain and TLS, add the domain to Firebase Auth authorized domains,
   and verify Google sign-in, password reset links, login handoffs, PayPal return
   flows, browser/mobile API origins, and any external callback configuration.
6. Check `/api/health` returns HTTP 200 and exactly `status`, `timestamp`, and
   package `version` (currently 0.1.0), with `Cache-Control: no-store`. Check `/`,
   `/pricing`, `/login`, protected dashboard access, `/web`, a static asset,
   `/_next/image`, uploads, authenticated API calls and video range requests.
   Repeat the container check with a different `PORT`, e.g.
   `docker run --rm -e PORT=9090 -p 9090:9090 IMAGE` and request port 9090.

## Migration audit and remaining risks

| Area | Finding / action |
| --- | --- |
| Hosting migration | Legacy app proxy/redirect handling and Vercel canonical URL fallbacks are removed. See [Firebase Hosting routing and deployment](firebase-hosting.md). Historical caching notes and tooling exclusions remain. |
| Middleware | Root `middelware.ts` is misspelled and is not a recognized middleware/proxy entry. It was left unchanged to avoid introducing new authentication behavior. Review dashboard authorization separately before launch; do not assume that file protects requests. |
| Background work / cron | No cron configuration found. Payment follow-ups use Cloud Tasks, but scheduling failures fall back to `after()` with a 30-second sleep. Request-based CPU allocation or instance shutdown can interrupt this. Ensure the queue works; if retaining the fallback, instance-based billing/CPU and minimum instances help but do not guarantee delivery. Durable task handling is the reliable path. |
| Request duration | `maxDuration=60` on payment queries and `maxDuration=300` on broadcasts do not configure Cloud Run timeouts. Configure the service timeout explicitly and verify AI generation, broadcasts, storage sync and streaming under load. A timeout/disconnect does not guarantee cancellation of work or rollback; test retries for duplicate effects, including follow-up emails. |
| Filesystem / memory | No application-local persistent filesystem writes found in runtime code; video write streams target cloud buckets. Migration/import scripts read local files and are not container startup tasks. Cloud Run local storage is ephemeral and memory-backed. Uploads buffer files in memory; size memory/concurrency for simultaneous uploads and video operations. |
| Caching / images | `next/image` remains enabled; sharp is present in the lockfile. Verify the Linux image optimizer. Local image/data caches are per instance and disappear on restart. Pricing mutation routes retain `revalidatePath`, though pricing now renders dynamically; country lookups use revalidation. Multi-instance invalidation is not coordinated. Shared-cache or CDN design is a separate change. `s-maxage` response headers alone do not create a CDN on Cloud Run. |
| Credentials / services | Firebase, Drive and Storage currently require explicit service-account keys in environment variables. Secret Manager injection preserves behavior; a future ADC migration would require code changes. Verify Firestore indexes, storage access, Drive shares, SMTP, Gemini, Cloudinary and PayPal connectivity. |
| Build/runtime configuration | Browser Firebase configuration is needed during build. Public values are fixed per image. Server data pages must receive their runtime credentials; check pricing data after deployment. External Google Fonts access is needed to build. |
| Health scope | Health is uncached process health only. A healthy response does not prove Firebase, queues, payments or email work. Use separate authenticated integration checks. |

References: [Cloud Run container contract](https://docs.cloud.google.com/run/docs/container-contract),
[Next.js environment variables](https://nextjs.org/docs/pages/guides/environment-variables),
[Docker Next.js guide](https://docs.docker.com/guides/nextjs/).

## Earlier Cloud Run preparation validation (before Hosting migration)

- `npx tsc --noEmit`: passed after the changes.
- `node --test tests/*.test.cjs tests/*.test.mjs`: all 10 tests passed,
  including build secret exclusion and multiline runtime environment handling.
- Health response checks: HTTP 200, exact public field set, package version,
  valid current timestamp and `Cache-Control: no-store` passed.
- `npm run lint`: 138 existing errors and 50 warnings across the repository.
  Focused lint on all changed TypeScript files has no errors (3 existing unused
  declaration warnings in pricing). The new Docker helper and its tests also
  pass focused lint. Lint was not disabled or loosened.
- `npm run build`: completed with exit 0 in an isolated copy with no `.env`
  files. The latest check uses only approved public configuration parsed from
  `.env.prod`; server values are removed from the build environment. Font downloads
  required network access. Next.js emitted an outdated Browserslist warning and
  a Windows EPERM warning copying the junction-linked node_modules into
  standalone output. The generated server starts on `0.0.0.0:9090` and its health
  endpoint responds correctly, but this local smoke test resolves dependencies
  from the test copy's parent node_modules and does not validate a Linux image.
- Docker image build/non-root runtime/image optimizer validation remains manual:
  Docker CLI is installed, but no Docker daemon was available in this session.
  No cloud deployment was performed.

For current migration verification and remaining auth limitations, see [firebase-hosting.md](firebase-hosting.md).
