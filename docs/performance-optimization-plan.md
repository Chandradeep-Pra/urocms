# Urologics performance optimization plan

Date: 2026-09-14. Scope: `urocms` and sibling `testing-zone` (served at `/web`).
This is a code-informed implementation plan, not a completed performance benchmark.
No application, infrastructure, or deployment changes were made for this review.

## Recommended direction

Keep the two applications and one authoritative backend. Reduce redundant requests,
make ordinary reads genuinely read-only, separate public catalog data from personal
access decisions, and deliver video bytes directly from Storage. Introduce CDN/HLS
only after the simpler path is measured. Skeletons should make useful structure
visible immediately while the underlying work is reduced.

## Findings grounded in the current code

| Finding | Evidence | Implication |
| --- | --- | --- |
| Authentication restore always refreshes the token, retrieves access/profile, and syncs a playback cookie before publishing the user. | `testing-zone/lib/urologics-auth.ts: refreshStoredAuth/buildUserFromAuth`; `components/auth/AuthProvider.tsx: restoreSession` | A serial startup chain even when the stored token has time remaining. |
| Courses can load as a guest before auth restoration, then load again when `user.idToken` changes. | `testing-zone/app/courses/page.tsx` effect keyed by `user?.idToken`, without an auth-loading gate | Duplicate work and possible locked/unlocked UI flicker; token refresh also invalidates the page's data unnecessarily. |
| JSON routes commonly proxy to the main app with `no-store`; library proxies don't forward section/pagination parameters. | `testing-zone/lib/urologics-api.ts`; `app/api/urologics/videos/library/route.ts` | Extra request hop and no shared browser request cache. Existing backend query options cannot be fully used. |
| Student non-YouTube playback always uses the local stream proxy, including Storage videos. | `testing-zone/components/courses/ModernVideoPlayer.tsx`, `app/api/urologics/videos/[id]/stream/route.ts` | Browser → student Cloud Run → main Cloud Run → Storage/Drive for video ranges, despite `/play` already returning a signed Storage URL. |
| Session resolution performs repeated user reads and an email lookup, then writes/merges records. | `urocms/lib/server/appSession.ts: requireAppUser`; `lib/server/userIdentity.ts: resolveCanonicalUserRecord` | Read endpoints can perform identity maintenance, write `updatedAt`, and potentially merge duplicates. This should not be routine request work. |
| Access resolution loads visible courses, including membership/grant arrays, and a plan record. | `urocms/lib/server/appContentAccess.ts: buildAppContentAccessContext/loadVisibleCourses`; `appPlanAccess.ts` | Repeated work grows with course and membership counts. Private grants must not become public catalog cache entries. |
| Video library requests load full video/section collections and spread full document data. `includeVideos=0` still performs video reads/calculations. | `urocms/app/api/app/videos/library/route.ts` | Large payloads and database work even for a section overview. Filtering the response alone does not remove read costs. |
| Stream handlers repeat document/access/metadata work; Drive admin streams also fetch debug metadata. | `urocms/lib/server/videoStreamService.ts`; `googleCloudStorage.ts` | Extra latency on each range/seek. Range parsing also needs suffix/invalid-range correctness tests. |
| Many student screens use a generic centered loader; admin has no route `loading.tsx` boundaries. | `testing-zone/app/loading.tsx`, courses/user/mocks pages; `urocms/app/dashboard` | Limited progressive rendering and layout-specific feedback. |
| Admin video page loads library and Drive explorer on mount; folder selection fetches permissions. | `urocms/app/dashboard/content/videos/page.tsx`; `components/videos/DriveVideoPanel.tsx` | Administrative import/sharing work competes with normal browsing. |
| Basic API metrics already exist. | `urocms/lib/server/apiMetrics.ts` | Extend existing instrumentation. It currently serializes JSON once to measure bytes and again to respond, even with debug metrics disabled. |

## Phase 0 — establish a production baseline

Measure deployed production builds, not `next dev` compilation times. Capture cold
and warm visits separately, signed-out/free/paid/admin roles, desktop and a mobile
4G profile. Cover landing → login → student home → courses → video → seek,
profile, mocks, and admin video browsing. Include user-relevant UK and India probes
if both populations matter; determine actual traffic distribution before choosing
regions or CDN investment.

Extend `apiMetrics.ts` with correlation IDs and `Server-Timing` for authentication,
user lookup, entitlement lookup, Firestore, signing, and upstream requests. Forward
these through retained proxies. Record p50/p95 latency, requests/navigation,
Firestore reads and writes, compressed payload size, and cold starts. Sample
metrics and avoid duplicate JSON serialization when metrics are off. Never log
tokens, signed URLs, keys, or full user records.

Add browser measurements for LCP, INP, CLS, click-to-first-frame, seek recovery,
playback errors, buffering frequency and buffered duration. These are proposed
acceptance targets, to be revised against real geography/network baselines:

| Metric | Initial target |
| --- | --- |
| Core page experience | p75 LCP ≤2.5s, INP ≤200ms, CLS ≤0.1 |
| Warm catalog API | p95 ≤500ms end-to-end on the reference network |
| Repeat navigation with fresh cached data | Useful content within 200ms |
| Video startup | p75 ≤2s, p95 ≤4s on a documented 4G profile |
| Seek recovery | p95 ≤2s on the reference profile |
| Query efficiency | No duplicate identical in-flight read per user/query; no identity writes on routine reads |

## Phase 1 — remove the largest avoidable delays

1. **Use direct Storage playback in both players.** For provider `storage`, use
   `/play`'s signed URL as the video source. Authorize each playback-session request
   on the backend; keep the bucket private. Video byte ranges should bypass both
   Cloud Run apps. Retain the authorized proxy as a measured fallback for supported
   non-Storage sources, not the default. Prefer Storage-published content for students.
   Do not automatically share Drive files during playback; importing and publishing
   should be explicit admin operations.
2. **Handle real playback states.** Show poster + reserved aspect ratio immediately,
   then loading/buffering, playing, ended, and actionable errors. Catch `play()`
   rejection; autoplay restrictions should leave a working Play button. Use metadata
   preload for the selected lesson; don't preload the library. Cancel stale playback
   requests when clicking a different lesson. An expired URL gets one authorized
   renewal and resumes at the current timestamp; avoid retry loops. Recheck expiry
   during long lectures and on tab resume. Verify CORS as needed for JS-based
   players, MIME types, H.264/AAC compatibility and MP4 fast-start metadata.
3. **Make user resolution read-only.** Resolve canonical identity during sign-in,
   migration, or explicit profile reconciliation. Persist a canonical mapping and
   reuse the initial user snapshot in request processing. Ordinary API reads use
   that mapping; they do not rewrite profiles or merge duplicate accounts. Test
   legacy duplicate accounts before rollout. Pass one explicit request-scoped access
   context through services; don't assume React memoization deduplicates unrelated
   route-handler calls.
4. **Fix startup orchestration.** Reuse an unexpired token with a refresh margin;
   deduplicate concurrent refreshes, refresh once on 401 and retry once. Publish the
   page shell immediately, while keeping paid content gated by server decisions.
   Avoid a guest library request until auth restoration is settled. Decouple playback
   cookie setup from unrelated page rendering if still needed by fallback streaming;
   check cookie-sync failures. Keep expiry/account switch/logout behavior correct.

Deliver this phase first. It improves both latency and request volume without
adding a new caching service or migrating frameworks.

## Phase 2 — one request layer and smaller API responses

Use one browser query layer (select one established query library during
implementation), shared across pages and components. It owns typed responses,
timeouts, AbortSignal handling, in-flight deduplication, limited retry/backoff,
refresh handling, and explicit invalidation after mutations. Cache keys use user
identity, query parameters and access version where applicable—not the raw token.
Clear private data on logout/account switch. Do not retry payment/submission writes
unless an idempotency design exists.

For same-origin production `/web`, call the main app's `/api/app/*` and public
endpoints directly for simple JSON reads. Configure local development routing so
this never silently hits production. Keep a thin student backend only where it adds
value (AI sessions, server-only credentials, aggregation, or genuine cookie handling).
Centralize any remaining proxy code and propagate query strings, status, range,
cache policy, request IDs, and cancellation. Replace automatic 401 → guest fallback
with explicit session recovery, except for a deliberate public-preview journey.

Return a lean section overview, then fetch a selected section's lessons with cursor
pagination. Store/update overview counts on content mutation; `includeVideos=0`
must avoid the full library scan. Use DTO allowlists rather than spreading Firestore
documents. Precompute course-to-content relationships; avoid loading everyone's
membership arrays to answer one user's access check. Add indexes only for the
actual query shapes. Prefetch the next likely section on intent or idle, with a
budget; never prefetch all videos.

Reuse the access/profile response already obtained during bootstrap. Consolidate
only data always needed together; avoid a huge bootstrap endpoint that blocks the
shell on purchases/history or optional dashboard widgets.

## Phase 3 — deliberate caching and invalidation

The following are starting policies, not measured optimal TTLs:

| Data | Cache policy | Invalidation/freshness |
| --- | --- | --- |
| Public titles, descriptions, thumbnails, published section summaries | Shared server/CDN cache 5–15 min; stale-while-revalidate where safe | Invalidate after publish/edit/delete; TTL is fallback |
| Public announcements/plan display | Shared 1–5 min; schedule-aware expiry | Invalidate edits; checkout validates current price/eligibility live |
| User library display/access summary | Private in-memory browser cache 30–60s | Invalidate purchase, grant, profile/access change and logout; backend still authorizes protected operations |
| Progress/bookmarks/profile | User-scoped browser cache 15–30s | Optimistic UI only for reversible actions; confirm writes and roll back errors |
| Authorization, payments, exam attempts/answers, live viva state | No public caching; keep sensitive action checks fresh | Never treat stale UI state as permission to access content or submit work |
| Signed playback responses | Private/no-store HTTP response; selected-player memory only | Renew before expiry; document maximum continued access window after revocation |
| Immutable versioned media and thumbnails | Long-lived cache, with authorization at the delivery layer for protected media | New content gets a new object/version; never publicize the private bucket |
| Admin lists and Drive explorer | Short private client cache, roughly 15–30s | Explicit refresh and mutation invalidation |

First cache safe public catalog data and deduplicate private requests. Do not add a
global cache of entitlement decisions with no revocation path. When shared server
caching is introduced, coordinate invalidation across Cloud Run instances; module
memory and per-container Next caches are not a reliable global invalidation system.
Tag invalidation in the CMS alone also does not invalidate an independent student
service cache. Choose one authoritative cache layer instead of stacking several
long TTLs. See [Next.js self-hosting guidance](https://nextjs.org/docs/app/guides/self-hosting).

## Phase 4 — skeletons and progressive screens

Create reusable page-specific skeletons: course tiles, lesson sidebar rows, profile
summary, mock cards, and admin tables. Match final dimensions, image aspect ratios,
and text lines. Keep navigation, headings and available cached content visible while
individual sections refresh. Add appropriate route `loading.tsx`/Suspense boundaries,
plus component loading states for client fetches. Distinguish first load, background
refresh, empty data, errors and access denied; a spinner must not hide a failed request.
Use `aria-busy`, short accessible status messages, and reduced-motion support.

Lazy-load the admin Drive explorer and permissions tools when opened. Load player,
PDF/export, and AI/audio modules only on relevant routes or user intent, guided by a
bundle report. Preserve instant placeholders so code splitting doesn't create a
second blank state. Paginate before introducing virtualization; virtualize only
lists proven too large. Batch progress updates at controlled intervals and on
pause/end/leave, not on every `timeupdate`; retain exam durability separately.

## Phase 5 — infrastructure and adaptive streaming, if measurements justify it

Verify the deployed region, Firestore location and bucket location for both projects.
Do not assume the hosting project equals the database project. Benchmark co-location
before moving anything; [Firestore recommends considering proximity to compute](https://firebase.google.com/docs/firestore/best-practices).
Check CPU/memory, concurrency, cold-start frequency and downstream saturation before
raising instance limits. Consider a minimum warm instance only when cold-start data
and the ongoing cost support it. Preserve separate tuning for AI work and video APIs.

Direct signed MP4 is the first milestone, not the final choice for every network.
If startup/rebuffering remains poor, create a background media processing pipeline
that validates codecs, generates posters/duration, and produces adaptive HLS renditions
appropriate to source resolution and lecture readability. Publish only when ready.
Deliver manifests and segments through authenticated Cloud CDN/Media CDN with signed
requests; do not merely reuse a GCS signed URL as a CDN design. Verify segment auth,
expiry, cache hits, CORS, Safari/native HLS and other browser playback. Obtain actual
traffic/storage/transcoding cost estimates before provisioning this layer.
See [Cloud CDN content access control](https://docs.cloud.google.com/cdn/docs/authenticate-content).

## Rollout and definition of done

Implement in bounded changes: (1) telemetry baseline, (2) direct media delivery,
(3) read-only session resolution and startup deduplication, (4) paginated APIs/query
cache, (5) screen skeletons and lazy modules, (6) optional CDN/HLS. Compare metrics
after each change, then canary a Cloud Run revision and preserve rollback.

Test guest/free/paid/admin behavior, two users switching on the same browser,
logout/expiry, purchase/grant/revoke, stale catalog edits, empty sections, network
failure and slow connections. Test long lectures, seeks, suffix/invalid byte ranges,
expired URLs and unsupported media. Both repositories must pass their production
builds and relevant tests; Cloud Build must receive the correct public build settings
and Cloud Run the separate runtime credentials. Accept performance improvements only
with before/after measurements and no permission/correctness regressions.

Open measurements: real audience geography, concurrent playback demand, library size,
codec/bitrate distribution, revocation requirements, Firestore/bucket regions, cold
start contribution and cost budget. These affect tuning, but don't block Phase 0–1.
