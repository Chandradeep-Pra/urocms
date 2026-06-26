# API Caching And Transfer Audit

Date: 2026-06-26

This audit covers the UroCMS Next.js deployment and the React Native/Expo app consumers. The goal is to reduce Vercel Fast Origin Transfer without changing product behavior, authentication, authorization, payments, or Firestore security rules.

## Executive Summary

The most likely transfer drivers are:

- Video byte proxy routes: `/api/app/videos/[id]/stream`, `/api/public/videos/[id]/stream`, `/api/videos/videoItem/[id]/stream`.
- Large nested JSON routes: `/api/app/videos/library`, `/api/public/videos/library`, `/api/app/quizzes/[id]`, `/api/app/mocks/[id]`, `/api/public/mocks/[id]`.
- Dynamic public pages/content: `/pricing` was forced dynamic and queried Firestore on every request.
- React Native raw `fetch` usage without a shared query/cache layer. No TanStack Query setup was found; several screens fetch on mount and some use `AppState`/intervals.

## API Debug Metrics

Temporary safe observability was added through `lib/server/apiMetrics.ts`.

Enable with:

```env
API_DEBUG_METRICS=true
```

When enabled, selected API routes log:

- `method`
- `route`
- `status`
- `durationMs`
- `responseBytes`
- `userId` only where already available as Firebase UID
- `itemCount` for lists/question arrays

The logger does not log tokens, passwords, full payloads, question answers, or emails.

## Endpoint Inventory

### Auth/Admin/System

- `/api/admin/session`
- `/api/auth/forgot-password`
- `/api/auth/google/complete`
- `/api/auth/role`
- `/api/dashboard`
- `/api/validate-user`
- `/api/upgrade-user`
- `/api/users/[id]`

Policy: private/no-store. These are user/admin/session-specific.

### App User APIs

- `/api/app/access`
- `/api/app/account`
- `/api/app/bookmarks`
- `/api/app/bookmarks/[id]`
- `/api/app/courses`
- `/api/app/devices/register`
- `/api/app/me/bookmarks`
- `/api/app/me/mock-attempts`
- `/api/app/me/progress`
- `/api/app/me/quiz-attempts`
- `/api/app/me/video-progress`
- `/api/app/me/viva-attempts`
- `/api/app/mocks`
- `/api/app/mocks/[id]`
- `/api/app/mocks/[id]/attempts`
- `/api/app/notifications`
- `/api/app/profile`
- `/api/app/quizzes`
- `/api/app/quizzes/[id]`
- `/api/app/quizzes/[id]/attempts`
- `/api/app/videos/library`
- `/api/app/videos/[id]/play`
- `/api/app/videos/[id]/progress`
- `/api/app/videos/[id]/stream`
- `/api/app/viva-attempts`
- `/api/app/viva-cases`
- `/api/app/viva-cases/[id]`
- `/api/app/viva-folders`

Policy: private/no-store. These responses are user-specific because access, attempts, progress, bookmarks, quota, and entitlement differ per user.

### Public Content APIs

- `/api/announcements`
- `/api/countries/dial-codes`
- `/api/public/mocks`
- `/api/public/mocks/[id]`
- `/api/public/mocks/[id]/attempts`
- `/api/public/videos/library`
- `/api/public/videos/[id]/play`
- `/api/public/videos/[id]/stream`
- `/api/public/viva-cases`
- `/api/public/viva-cases/[id]`
- `/api/public/viva-cases/[id]/start`
- `/api/testimonials`
- `/api/feedback-responses/publishable`
- `/api/joinlist`

Policy: content-like GET routes can use `public, s-maxage=3600, stale-while-revalidate=86400` where the response has no signed URL and no user-specific data. Attempt/start/mutation routes stay no-store.

### CMS Content/Admin APIs

- `/api/chapters`
- `/api/chapters/[id]`
- `/api/courses`
- `/api/courses/content-catalog`
- `/api/courses/members-catalog`
- `/api/courses/[id]`
- `/api/daily-quiz`
- `/api/daily-quiz/generate`
- `/api/daily-quiz/history`
- `/api/daily-quiz/pick-topic`
- `/api/daily-quiz/submit-quiz`
- `/api/daily-quiz/[id]`
- `/api/feedback-forms`
- `/api/feedback-forms/[id]`
- `/api/mocks`
- `/api/mocks/[id]`
- `/api/mocks/[id]/attempts`
- `/api/notifications`
- `/api/pricing-coupons`
- `/api/pricing-coupons/[id]`
- `/api/pricing-plans`
- `/api/pricing-plans/presets`
- `/api/pricing-plans/waitlist`
- `/api/pricing-plans/[id]`
- `/api/question-banks`
- `/api/question-banks/[id]`
- `/api/questions`
- `/api/questions/[id]`
- `/api/quizzes`
- `/api/quizzes/[id]`
- `/api/testimonials/[id]`
- `/api/viva-attempts`
- `/api/viva-cases`
- `/api/viva-cases/[id]`
- `/api/viva-folders`

Policy: admin/CMS mutation/list endpoints should remain private/no-store unless a separate public summary endpoint is created.

### Media, Upload, And Drive APIs

- `/api/cloudinary-upload`
- `/api/upload-image`
- `/api/videos/drive-folders`
- `/api/videos/drive-library`
- `/api/videos/drive-permissions`
- `/api/videos/library`
- `/api/videos/sync-drive-access`
- `/api/videos/videoItem`
- `/api/videos/videoItem/[id]`
- `/api/videos/videoItem/[id]/play`
- `/api/videos/videoItem/[id]/stream`
- `/api/videos/videoItem/[id]/sync-storage`
- `/api/videos/videoSection`
- `/api/videos/videoSection/[id]`

Policy: uploads/mutations/private Drive operations are no-store. Video `play` endpoints should return small signed playback metadata. Video `stream` endpoints are transfer risks because they proxy file bytes through Next.js.

## High-Transfer Routes Found

| Route | Risk | Current behavior | Change made |
| --- | --- | --- | --- |
| `/api/app/videos/library` | High JSON size | Returns sections plus nested videos and top-level videos | Added metrics, private no-store, optional `includeVideos=0` lightweight mode |
| `/api/public/videos/library` | High JSON size | Returns public sections plus nested videos and top-level videos with `no-store` | Added metrics, public CDN cache for success, optional `includeVideos=0` |
| `/api/app/quizzes/[id]` | High JSON size | Returns all visible questions, options, images, and explanations | Added metrics/private no-store; contract preserved |
| `/api/app/mocks/[id]` | High JSON size | Returns mock questions and quiz metadata | Added metrics/private no-store; contract preserved |
| `/api/public/mocks/[id]` | High JSON size | Returns full public mock details/questions | Added metrics and public CDN cache for successful public mock detail |
| `/api/app/videos/[id]/stream` | Very high byte transfer | Streams GCS/Drive file bytes through Next.js | Identified as risky; no behavior change in this pass |
| `/api/public/videos/[id]/stream` | Very high byte transfer | Streams free/public video bytes through Next.js | Identified as risky; no behavior change in this pass |
| `/api/videos/videoItem/[id]/stream` | Very high byte transfer | Admin video stream proxy | Identified as risky; no behavior change in this pass |
| `/pricing` | Repeated public server work | `force-dynamic`, Firestore reads each hit | Changed to hourly ISR via `revalidate = 3600` |

## Old Vs New Payload Behavior

- Existing API contracts are preserved by default.
- `/api/app/videos/library` and `/api/public/videos/library` now support `includeVideos=0`.
- With `includeVideos=0`, sections still include `videoCount`, access state, image/title metadata, and ordering, but nested `videos` arrays and top-level `videos` are empty.
- Existing mobile/web consumers continue to receive full payloads because the default remains `includeVideos=1`.

## Cache Policy Applied

### Public/shared success responses

Use:

```http
Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400
```

Applied to:

- `/api/announcements`
- `/api/public/mocks`
- `/api/public/mocks/[id]`
- `/api/public/videos/library`

### Authenticated/private responses

Use:

```http
Cache-Control: private, no-store
```

Applied to:

- `/api/app/courses`
- `/api/app/quizzes`
- `/api/app/quizzes/[id]`
- `/api/app/mocks`
- `/api/app/mocks/[id]`
- `/api/app/videos/library`
- `/api/app/videos/[id]/play`
- `/api/public/videos/[id]/play` because it can return signed URLs

## React Native / Expo Findings

No TanStack Query or React Query setup was found. The RN app uses custom hooks and raw `fetch` through `services/appApi.ts`, plus some direct fetches.

Notable fetch/refetch points:

- `app/(tabs)/index.tsx` calls `getVideoLibrary()` on mount for home sections.
- `app/(tabs)/courses.tsx` loads courses, video library, quizzes, mocks, and viva cases together.
- `app/videos/index.tsx` loads full video library.
- `app/tests/index.tsx` loads quizzes and mocks.
- `app/quiz/[id].tsx` fetches quiz/mock details and uses timers/AppState listeners.
- `app/videos/[id].tsx` uses AppState and periodic progress updates.
- `hooks/useDailyQuiz.ts` already uses AsyncStorage for local daily quiz attempt state.
- `hooks/useAnnouncements.ts` fetches announcements directly.

Safe next RN step:

- Add a user-scoped cache wrapper before persisting authenticated content. Cache keys must include the Firebase UID or another safe stable user namespace to avoid leaking one user’s entitled content to another after logout/login.
- Public content such as announcements, testimonials, and country dial codes can use plain TTL AsyncStorage caching.
- Shared-but-entitlement-shaped content like videos/courses/quizzes should use short memory cache or UID-scoped persisted cache.

## Media Delivery Findings

Video playback should prefer the `play` endpoints, which return small metadata and signed URL information where available.

Remaining risky byte-proxy routes:

- `/api/app/videos/[id]/stream`
- `/api/public/videos/[id]/stream`
- `/api/videos/videoItem/[id]/stream`

Recommended follow-up:

- For GCS/Firebase Storage videos, have `play` return signed read URLs and make clients play those URLs directly.
- Keep stream routes only as fallback/debug or remove them after all clients migrate.
- For Drive-backed videos that cannot be directly downloaded, sync to GCS first, then serve signed GCS URLs.

## Verification Checklist

### API metrics

1. Set `API_DEBUG_METRICS=true` in the deployment environment.
2. Hit high-traffic screens: home, courses, video library, tests, mock detail, quiz detail.
3. Check server logs for `[api-metrics]`.
4. Confirm `responseBytes` and `itemCount` for:
   - `/api/app/videos/library`
   - `/api/app/quizzes/[id]`
   - `/api/app/mocks/[id]`
   - `/api/public/videos/library`

### Request count and response size in mobile app

1. Run the Expo app with a proxy inspector such as Proxyman, Charles, Flipper network plugin, or Android Studio Network Inspector.
2. Navigate cold-start -> home -> courses -> video -> tests.
3. Count duplicate calls to the same endpoint within 10 seconds.
4. Compare response sizes before/after using server `[api-metrics]` and the inspector.

### Cache hits/misses

1. In Vercel function/network logs, inspect response headers for public endpoints.
2. Check for `Cache-Control: public, s-maxage=3600, stale-while-revalidate=86400`.
3. Confirm private endpoints include `Cache-Control: private, no-store`.
4. Confirm signed-url endpoints are not publicly cached.

### Routes to retest after deploy

- Public landing page announcement carousel.
- Pricing page.
- RN home screen video sections.
- RN courses tab.
- RN tests tab.
- Quiz start/review/submit.
- Mock start/rules/result.
- Video play for free and paid users.
- Testing Zone `/web/mocks` and `/web/courses`.

## Remaining Product-Level Decisions

- Whether quiz/mock details can be split into paginated question fetches without changing test UX.
- Whether explanations/images should load after answer submission instead of initial question fetch.
- Whether all RN content screens should move to TanStack Query with persisted UID-scoped cache.
- Whether stream routes can be fully deprecated after clients consume direct signed GCS URLs.
- Whether admin list endpoints need pagination for very large CMS datasets.
