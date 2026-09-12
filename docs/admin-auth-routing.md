# Admin login and authorization fix

## Root cause and inspection

`lib/server/adminAccess.ts` previously split the allowlist on commas only. A JSON
array retained quotes/brackets in each result and failed exact email matching.
The role endpoint returned `isAdmin: false`, so both login and landing-page
Firebase listeners selected the student app instead of showing their existing
admin choice. Email trimming/lowercasing already existed; the variable name was
correct. The public-variable fallback was unnecessary and has been removed.

The existing admin route is `/dashboard`. No new dashboard or auth provider was
introduced. The main application remains `urologics-web`, served at
`https://urologics.co.uk`; the student app remains `/web`. This fix does not deploy
either service, edit Firebase Hosting routing, or restore old provider redirects.

The login page previously read only `redirect` in an effect and could begin
restoring authentication with a stale default destination. It now reads the
query at the role request and delegates destination selection to the verified
server response. Explicit sign-in suppresses competing initial-session routing.
Supported parameter precedence: `next`, `redirect`, `callbackUrl`, `redirectTo`,
`returnTo`. None can override an admin's dashboard choice with `/web`.

`middelware.ts` is misspelled and inactive; its cookie-presence check is not
authorization. It was not activated. The dashboard layout now verifies the
Firebase ID-token cookie server-side. Its data-loading server pages independently
authorize before reads, since layouts and pages can render in parallel.

## Final behavior

- Verified admin: existing choice dialog, with Admin dashboard first. Choosing
  admin opens `/dashboard` or a validated relative `/dashboard/...` destination.
- Choosing the student app deliberately opens `/web` or a safe student/checkout
  destination. Admin status does not get silently overridden by stale callbacks.
- Authenticated non-admin: `/web`, or an allowed relative `/web/...` or `/checkout`
  destination. Dashboard destinations are rejected.
- Absolute URLs (including same-origin absolute URLs), protocol-relative URLs,
  backslashes, control characters, encoded traversal/external paths and malformed
  percent escapes fail closed. Checkout now sends a relative return path.
- Missing/malformed allowlist: no admin access. JSON arrays and CSV are accepted;
  entries must be email strings and are trimmed/lowercased. No public fallback.
- Missing/invalid/revoked tokens: unauthorized. Verified non-admin tokens: denied
  on admin APIs. Allowlist checks only use Firebase Admin's verified token email.

## Session and API protection

The existing `/api/auth/role` GET verifies the bearer Firebase ID token, including
revocation, and refreshes the existing shared `__session` ID-token cookie. This
is not a Firebase session-cookie token or a second authentication system.
Cookie attributes are HttpOnly, Secure in production, SameSite=Lax and Path=/;
expiry never exceeds the ID token expiry. Role responses are private/no-store.
The student app already uses this cookie name, format and path. Every admin
consumer verifies the token cryptographically; cookie presence is never enough.

Existing admin APIs continue accepting bearer tokens. Cookie fallback permits
browser reads/streaming and requires the exact configured Origin on mutations,
preventing cross-origin cookie-authenticated writes. Explicit invalid bearer
credentials never fall back to a valid cookie. The dashboard, chapters, image
uploads and admin video stream now enforce authorization before doing any work.
Public/student endpoints retain their existing purpose and permissions.

The dashboard guard refreshes the role/cookie on Firebase token changes, keeps
student authentication intact when admin access is denied, and responds to the
existing cross-tab logout signal. Explicit main-app logout clears the shared
cookie before Firebase sign-out/navigation. Firebase browser persistence and the
existing localStorage handoff remain unchanged. No tokens enter redirect URLs.

## Environment variables (names only)

| Variable | Timing | Purpose |
| --- | --- | --- |
| `ADMIN_ALLOWED_EMAILS` | Runtime only | Admin authorization; JSON string array or CSV |
| `FIREBASE_PROJECT_ID` | Runtime only | Existing Firebase Admin project |
| `FIREBASE_CLIENT_EMAIL` | Runtime only | Existing Firebase Admin identity |
| `FIREBASE_PRIVATE_KEY` | Runtime only | Existing Firebase Admin credential |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Build time | Browser Firebase configuration |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Build time | Browser Firebase configuration |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Build time | Browser Firebase configuration |
| `NEXT_PUBLIC_SITE_URL` | Build time and runtime | Canonical origin, including cookie-write Origin checks |
| `NODE_ENV` | Runtime; already set by image | Production Secure-cookie behavior |

`NEXT_PUBLIC_ADMIN_ALLOWED_EMAILS` is not required or supported. Remove any old
public allowlist setting and rebuild to replace historical browser bundles. The
runtime Firebase project and browser configuration must refer to the same Auth
project. Storage, email, payment and other feature variables are unchanged.

## Files changed for this fix

- `lib/server/adminAccess.ts`: parser, server-only policy, revoked-token checking,
  shared-cookie fallback and Origin checks.
- `lib/server/dashboardSession.ts`: request-scoped server dashboard authorization.
- `app/api/auth/role/route.ts`: verified destinations, shared cookie refresh/logout.
- `lib/user-app.ts`: role-scoped relative redirect validation.
- `app/login/page.tsx`: server-selected destinations and existing admin choice.
- `app/checkout/page.tsx`: relative checkout return URL.
- `app/dashboard/layout.tsx`, `app/dashboard/users/page.tsx`,
  `app/dashboard/users/[id]/page.tsx`,
  `app/dashboard/system/access-simulator/page.tsx`: server checks before rendering/data.
- `components/dashboard/AdminGuard.tsx`: token refresh and cross-tab logout without
  signing students out merely for lacking admin permission.
- `lib/testingZoneAuthHandoff.ts`, `app/dashboard/settings/page.tsx`: clear the
  shared server cookie on explicit logout.
- `app/api/dashboard/route.ts`, `app/api/chapters/route.ts`,
  `app/api/chapters/[id]/route.ts`, `app/api/cloudinary-upload/route.ts`,
  `app/api/upload-image/route.ts`, `app/api/videos/videoItem/[id]/stream/route.ts`:
  previously missing admin authorization.
- `Dockerfile`, `cloudbuild.yaml`, `scripts/cloud-run.mjs`, `docs/cloud-run.md`:
  remove public allowlist build support/instructions.
- `tests/admin-auth.test.mjs`, `tests/firebase-hosting.test.mjs`,
  `tests/cloud-run.test.mjs`: authorization,
  parsing, redirects, cookie/Origin, public-build exclusion and handler checks.
- `docs/admin-auth-routing.md`: this report.

Pre-existing edits to `Dockerfile` and `docs/firebase-hosting.md`, and the
untracked Cloud Build/ignore configuration, were preserved. Historical reports
in the hosting document describe the previous behavior; this report supersedes
its statements about the main app not consuming `__session`.

## Validation

TypeScript and the 21-test suite passed. The three configured production admin
identities were also checked locally, including uppercase/whitespace variants,
without logging their values. Focused lint passed with one existing login hook
dependency warning. Production build results are recorded after completion.
Live Firebase login, email delivery, payments and cloud deployment were not run.
