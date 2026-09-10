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

Firebase Hosting strips incoming cookies other than `__session`. The second app now writes/reads that cookie for playback with `Path=/`, HttpOnly, Secure in production and SameSite=Lax, and no-store responses. It carries a short-lived Firebase ID token, not an Admin session cookie. The main app does not currently consume it as a login session. Upstream Bearer-token validation is retained. The old `urologics_id_token` cookie is no longer read; session restoration issues the replacement. Its old value expires naturally.

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
node scripts/build-cloud-run.mjs ..\urocms\.env.prod asia-south1-docker.pkg.dev/proud-woods-489814-s6/urologics/urologics-web-app:hosting-migration-20260910
docker push asia-south1-docker.pkg.dev/proud-woods-489814-s6/urologics/urologics-web-app:hosting-migration-20260910

gcloud run deploy urologics-web --image=asia-south1-docker.pkg.dev/proud-woods-489814-s6/urologics/urologics-web:hosting-migration-20260910 --project=proud-woods-489814-s6 --region=asia-south1 --port=8080 --allow-unauthenticated --update-env-vars=NEXT_PUBLIC_SITE_URL=https://urologics.co.uk
gcloud run deploy urologics-web-app --image=asia-south1-docker.pkg.dev/proud-woods-489814-s6/urologics/urologics-web-app:hosting-migration-20260910 --project=proud-woods-489814-s6 --region=asia-south1 --port=8080 --allow-unauthenticated --update-env-vars=UROLOGICS_API_BASE=https://urologics.co.uk,VIVA_API_BASE=https://urologics.co.uk

Set-Location C:\Users\chand\Downloads\urocms
firebase deploy --only hosting:proud-woods-489814-s6 --project proud-woods-489814-s6 --config firebase.json
```

These service updates preserve unspecified existing runtime environment variables and secret bindings. If creating a service for the first time, configure the documented Secret Manager bindings and service identity first; secret names and IAM assignments are not inferable from this repository. No `--set-env-vars` or bulk reset is used. Public Cloud Run invocation enables Hosting access; application authentication remains in the existing handlers. Do not remove provider domains or change DNS as part of these commands.

Both builders read only approved public browser configuration from the main environment file for build arguments. Private values are runtime-only. Production environment files remain excluded from Docker contexts. Hosting configuration is deployed only from `urocms` so the second app cannot accidentally replace the catch-all rules.

References: [Hosting configuration and rewrite precedence](https://firebase.google.com/docs/hosting/full-config), [Cloud Run integration and timeouts](https://firebase.google.com/docs/hosting/cloud-run), [Hosting cookie forwarding](https://firebase.google.com/docs/hosting/manage-cache#using_cookies).

## Current validation

Results are recorded after the local checks finish. No cloud deployment or external integration mutation was performed.
