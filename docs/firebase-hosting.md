Current /web environment update: the second app build/run helpers now default to `testing-zone/.env.prod.stud`. Only its public Firebase key is passed during build; server values are injected at runtime, never copied into the image. Its Firebase key differs from the main `.env.prod` key, so the earlier cross-app key-parity result below is historical and must be reverified for this new source. Existing Cloud Run deploy commands preserve runtime settings; they do not import `.env.prod.stud`. See the second app's DEPLOYMENT.md for local build/run commands. No deployment has been performed.

# Firebase Hosting and Cloud Run migration

Status: configuration prepared locally; nothing deployed and no DNS, domains or external service settings changed. See the validation section before release.

## Routing

Project and Hosting site: `proud-woods-489814-s6`. Region: `asia-south1`.

| Request | Cloud Run service |
| --- | --- |
| `/web` | `urologics-web-app` |
| `/web/**` | `urologics-web-app` |
| `**` | `urologics-web` |

`firebase.json` puts both specific rules before the catch-all. `firebase-hosting-empty` contains only an ignored `.gitkeep`; it must stay free of `index.html` or other static files that override rewrites. Hosting preserves the original request path. Do not add a Next.js `/web` proxy or basePath to this main app. The second app alone builds with `/web`.

The main configuration keeps `output: "standalone"` and `serverExternalPackages: ["firebase-admin", "@google-cloud/tasks"]`. Its two old proxy rules were already removed in the supplied working tree and remain removed. Other pre-existing Docker, health and dynamic-rendering changes are preserved.

## Reviewed Vercel references

| File | Resolution |
| --- | --- |
| `next.config.ts` | Confirmed removal of `/web` and `/web/:path*` destinations at `https://testing-zone-five.vercel.app/web` and `https://testing-zone-five.vercel.app/web/:path*` in the existing uncommitted changes. |
| `app/login/page.tsx` | Removed the legacy host fallback, the Vercel redirect allowlist entry, and its path-rewriting branch. Same-origin `/web` and `/checkout` return destinations are validated in `lib/user-app.ts`; external destinations are rejected. Role verification and onboarding are unchanged. |
| `components/landing-page/Header.tsx` | Removed legacy-host detection; app navigation is `/web`. |
| `components/landing-page/SignUpDialog.tsx` | Removed legacy-host detection; app navigation is `/web`. |
| `lib/site.ts` | Removed `VERCEL_PROJECT_PRODUCTION_URL` and `VERCEL_URL` fallbacks. Public URL overrides remain supported; production defaults to `https://urologics.co.uk`. |
| `README.md` | Removed Vercel from hosting/stack branding and linked current deployment instructions. |
| `docs/cloud-run.md` | Replaced obsolete instructions to retain the Vercel proxy with the Hosting architecture. Earlier validation is labeled historical. |
| `.gitignore`, `.dockerignore` | Retained `.vercel` exclusions: valid protection against copying local provider metadata, not a runtime dependency. |
| `docs/api-caching-audit.md` | Retained historical Vercel transfer/logging context. This is an earlier audit, not the current deployment guide. |
| `tests/firebase-hosting.test.mjs` | A deliberate `legacy.vercel.app` negative redirect test remains. |
| Dependency lockfiles and Next.js upstream links | Retained upstream package provenance and legitimate vendor references. |

No active source file contains the old deployment hostname or proxies `/web` to it. All hardcoded production-domain links, PayPal SDK/API hosts, Google/Firebase API hosts, YouTube, Drive, Cloudinary, schema.org and professional/social links were reviewed and retained for their actual purpose.

## Authentication and manual integration checks

**Keep Firebase Auth project `urologics`**, using the existing `urologics.firebaseapp.com` auth domain and the main app's existing public API key. This is separate from the new Hosting/Cloud Run project `proud-woods-489814-s6`. Both `.env.local` and `.env.prod` agree on the public Firebase configuration and client/Admin project IDs. Do not replace the Auth project ID or API key with the Hosting project just because the cloud service moved.

The main app writes a compatible custom localStorage handoff (`urologics-testing-zone-auth`) that `/web` restores. LocalStorage sharing requires the exact production origin; run.app, web.app, firebaseapp.com and www hosts do not share it. Direct `/web` password login does not create the main app's Firebase SDK session. Already-open web tabs do not react to main logout, and token refresh is not periodic. These existing reverse-login/live-logout limitations require coordinated session work and real-account tests before claiming seamless bidirectional SSO.

Firebase Hosting strips incoming cookies other than `__session`. The second app now writes/reads that cookie for playback and authenticated mock exams with `Path=/`, HttpOnly, Secure in production and SameSite=Lax, and no-store responses. It carries a short-lived Firebase ID token, not an Admin session cookie. The main app does not currently consume it as a login session. Upstream Bearer-token validation is retained. The old `urologics_id_token` cookie is no longer read; session restoration issues the replacement. Its old value expires naturally.

Root `middelware.ts` is misspelled and not a recognized Next.js middleware entry. It only describes dashboard routing and contains no `/web` interception. It is deliberately not renamed here: activating its unverified `firebase-auth` cookie-presence check would change authentication behavior and would not work through Hosting cookie filtering. Existing `AdminGuard`, role checks and server-side Admin/Bearer authorization remain unchanged. Do not count the misspelled file as request protection.

No PayPal, OAuth, Firebase Auth, CORS, email or callback URL in the inspected source or environment files points to Vercel. External provider consoles were not inspected or changed. Before release manually check:

- Firebase Auth authorized domains includes `urologics.co.uk`; preserve `urologics.firebaseapp.com` while it remains the configured auth domain. Check Google OAuth JavaScript origins and the callback for that actual auth domain (`https://urologics.firebaseapp.com/__/auth/handler`). Do not blindly change it to the Hosting project/domain.
- PayPal app/webhook settings and any persisted checkout URLs use `https://urologics.co.uk`; source uses the PayPal SDK capture flow with no hardcoded Vercel return/cancel URL. Preserve live/sandbox mode and credentials.
- Runtime `NEXT_PUBLIC_SITE_URL=https://urologics.co.uk` for email, password reset and payment links. `PAYMENT_QUERY_TASK_URL=https://urologics.co.uk/api/internal/payment-query-followup`. Existing code defaults already use the production domain.
- Any external CORS/API-key referrer allowlists, mobile API settings, persisted CMS links or email templates not stored in this repository. No evidence of a stale URL in these external systems was available.
- Firebase Hosting imposes its own request timeout (60 seconds); a longer Cloud Run timeout does not extend it. Long AI/broadcast operations and video requests need production testing. The separate speech WebSocket host is retained.

## Exact deployment commands — reference only, not executed

Run in PowerShell after addressing validation failures and configuring the existing services' runtime secrets. The image commands below select an Artifact Registry repository named `urologics` and a release tag `hosting-migration-20260910`; substitute a new immutable tag for subsequent releases. Create the repository only if it does not already exist:

```powershell
gcloud artifacts repositories create urologics --repository-format=docker --location=asia-south1 --project=proud-woods-489814-s6
gcloud auth configure-docker asia-south1-docker.pkg.dev

Set-Location C:\Users\chand\Downloads\urocms
node scripts/cloud-run.mjs build asia-south1-docker.pkg.dev/proud-woods-489814-s6/urologics/urologics-web:hosting-migration-20260910
docker push asia-south1-docker.pkg.dev/proud-woods-489814-s6/urologics/urologics-web:hosting-migration-20260910

Set-Location C:\Users\chand\Downloads\testing-zone
node scripts/build-cloud-run.mjs asia-south1-docker.pkg.dev/proud-woods-489814-s6/urologics/urologics-web-app:hosting-migration-20260910
docker push asia-south1-docker.pkg.dev/proud-woods-489814-s6/urologics/urologics-web-app:hosting-migration-20260910

gcloud run deploy urologics-web --image=asia-south1-docker.pkg.dev/proud-woods-489814-s6/urologics/urologics-web:hosting-migration-20260910 --project=proud-woods-489814-s6 --region=asia-south1 --port=8080 --allow-unauthenticated --update-env-vars=NEXT_PUBLIC_SITE_URL=https://urologics.co.uk
gcloud run deploy urologics-web-app --image=asia-south1-docker.pkg.dev/proud-woods-489814-s6/urologics/urologics-web-app:hosting-migration-20260910 --project=proud-woods-489814-s6 --region=asia-south1 --port=8080 --allow-unauthenticated --update-env-vars=UROLOGICS_API_BASE=https://urologics.co.uk,VIVA_API_BASE=https://urologics.co.uk

Set-Location C:\Users\chand\Downloads\urocms
firebase deploy --only hosting --project proud-woods-489814-s6 --config firebase.json
```

These service updates preserve unspecified existing runtime environment variables and secret bindings. If creating a service for the first time, configure the documented Secret Manager bindings and service identity first; secret names and IAM assignments are not inferable from this repository. No `--set-env-vars` or bulk reset is used. Public Cloud Run invocation enables Hosting access; application authentication remains in the existing handlers. Do not remove provider domains or change DNS as part of these commands.

Both builders read only approved public browser configuration from the main environment file for build arguments. Private values are runtime-only. Production environment files remain excluded from Docker contexts. Hosting configuration is deployed only from `urocms` so the second app cannot accidentally replace the catch-all rules.

References: [Hosting configuration and rewrite precedence](https://firebase.google.com/docs/hosting/full-config), [Cloud Run integration and timeouts](https://firebase.google.com/docs/hosting/cloud-run), [Hosting cookie forwarding](https://firebase.google.com/docs/hosting/manage-cache#using_cookies).

## Current validation

| Check | Main `urocms` | Second `testing-zone` |
| --- | --- | --- |
| TypeScript | Passed (`npx tsc --noEmit`) | Passed (`npm run typecheck`) |
| Full lint | **Failed: 138 existing errors, 50 warnings** | Passed, 20 existing warnings |
| Changed-file lint | Passed, one existing login hook warning | Passed |
| Production build | Passed in an isolated environment-free copy with approved public Firebase values | Passed locally and in Linux Docker image |
| Regression tests | 7 Hosting/Cloud Run-helper tests passed | 9 path, cookie-consumer and speech tests passed |
| Routing smoke | `/web`, `/web/login`, `/web/api/urologics/access` return 404 with no redirect; unauthenticated admin session returns 401 | Pages, assets, optimized image, viva redirect, API boundary and `__session` flags pass |
| JSON and routing order | `firebase.json` parses; exact site/services/region/order and empty public directory verified | Not applicable; Hosting config lives in main repo |
| Linux container | Main image not rebuilt in this migration | Built, linux/amd64, non-root UID/GID 1000, port 8080, no `.env*` files under `/app` |
| Firebase parity | Local/prod client and Admin project IDs match (`urologics`) | Running image's JavaScript verified to contain exactly the main production public API key |

The main build emitted an outdated Browserslist notice and a Windows EPERM warning when tracing junction-linked node_modules into standalone output. Its generated server ran successfully, but that Windows result does not certify a portable Linux main image. No server secrets or `.env` files entered the isolated build copy. The restricted font download initially failed; the permitted network retry passed. The second image's first npm install hit ECONNRESET; retry and final cached rebuild passed.

Main lint errors were present before this migration: 111 `no-explicit-any`, 17 `no-require-imports`, 5 `set-state-in-effect`, 2 `ban-ts-comment`, 2 `no-assign-module-variable`, and 1 `static-components`. No main lint rules were disabled. This remains a failed release check; resolving it requires an independent repository-wide typing/React cleanup. Routing preparation is complete, but this report does not claim all release checks or end-to-end authentication passed.

No cloud deployment, DNS change, provider domain removal, external integration mutation or real payment/authentication write was performed. The local validation container was stopped.


## Complete changed-file inventory for this session

Main repository (`C:/Users/chand/Downloads/urocms`), authored or updated in this migration:

- `firebase.json` — ordered Hosting rules, site and public directory.
- `firebase-hosting-empty/.gitkeep` — empty public directory retained in Git, ignored by Hosting.
- `lib/user-app.ts` — safe production-origin `/web`/checkout return paths.
- `app/login/page.tsx` — removes legacy Vercel redirects and uses safe return paths.
- `components/landing-page/Header.tsx` — same-origin app navigation.
- `components/landing-page/SignUpDialog.tsx` — same-origin app navigation.
- `lib/site.ts` — production canonical URL without Vercel environment fallbacks.
- `README.md` — current deployment branding and documentation link.
- `docs/cloud-run.md` — replaces obsolete proxy guidance and labels earlier validation.
- `docs/firebase-hosting.md` — this audit, results and exact unexecuted deployment commands.
- `tests/firebase-hosting.test.mjs` — configuration, routing and redirect regression checks.

Pre-existing main working-tree changes were retained: `.dockerignore`, `Dockerfile`, `app/page.tsx`, `app/premium-explore/page.tsx`, `app/pricing/page.tsx`, `next.config.ts` (including the already-removed legacy rewrites), `app/api/health/route.ts`, `scripts/cloud-run.mjs`, and `tests/cloud-run.test.mjs`. `docs/cloud-run.md` was also pre-existing and was updated as listed above. No main `basePath` was introduced; `middelware.ts` and authorization handlers were not changed.

Second repository (`C:/Users/chand/Downloads/testing-zone`), deployment preparation across this session:

- `next.config.ts` — preserves the original `/web`, standalone and turbopack-root configuration; standalone was already an uncommitted change when inspection began.
- `Dockerfile`, `.dockerignore` — non-root Cloud Run image, port 8080 and deny-by-default build context excluding environments.
- `scripts/build-cloud-run.mjs` — build with only the main app's public Firebase key after client/Admin project consistency checks.
- `lib/app-path.ts` — idempotent internal paths, external URL preservation and safe login return paths.
- `app/layout.tsx` — prefixed metadata icons.
- `app/login/page.tsx` — normalized safe return destination.
- `components/ai-viva/useSpeechInput.ts` — shared path helper for audio assets.
- `components/ai-viva/VivaVoiceAi.tsx` — shared external-safe exhibit path handling.
- `app/api/urologics/session/route.ts` — Firebase Hosting-compatible cookie, root Path and private/no-store responses.
- `app/api/urologics/videos/[id]/stream/route.ts` — reads Hosting-compatible cookie.
- `app/api/mocks/route.ts`, `app/api/mocks/[id]/route.ts`, `app/api/mocks/[id]/attempts/route.ts` — read Hosting-compatible cookie while preserving upstream Bearer validation.
- `components/courses/ModernVideoPlayer.tsx` — keyed state initialization to fix existing lint error without effect-driven resets.
- `eslint.config.mjs` — allows CommonJS imports only in CommonJS tests.
- `tests/viva-tts-voice.test.cjs` — avoids shadowing the module variable in the existing test harness.
- `package.json` — adds a typecheck command.
- `tests/deployment-paths.test.mjs`, `tests/session-cookie.test.mjs` — URL and authenticated proxy regression tests.
- `tests/deployment-smoke.mjs`, `tests/run-deployment-smoke.mjs` — local-only production HTTP checks and standalone runner.
- `README.md`, `DEPLOYMENT.md` — replaces old Vercel hosting instructions, records configuration and session limitations. Valid Next.js/Vercel upstream and font references remain.

Generated diagnostic logs are local validation artifacts, not deployment inputs or source changes.
