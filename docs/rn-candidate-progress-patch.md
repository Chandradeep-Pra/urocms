# RN Candidate Progress Patch

## Objective

Patch the React Native app so it can track and consume candidate progress consistently across:

- videos
- mocks
- AI viva
- dashboard summary

This document reflects the current phase-1 backend progress work and explains:

- what is already available
- what the RN app should integrate now
- what is still pending

## Current Backend Status

### Implemented

- video progress save API
- video progress history API
- mock attempt history API
- viva attempt history API
- candidate progress summary API
- per-user mock attempt recording
- per-user viva attempt recording

### Pending

- quiz attempt APIs
- bookmarks APIs
- frontend instrumentation consistency
- richer dashboard analytics

## Current Source Files

Progress backend utilities:

- [C:\Users\HP\Downloads\urocms\lib\server\candidateProgress.ts](C:\Users\HP\Downloads\urocms\lib\server\candidateProgress.ts)

Progress APIs:

- [C:\Users\HP\Downloads\urocms\app\api\app\videos\[id]\progress\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\videos\[id]\progress\route.ts)
- [C:\Users\HP\Downloads\urocms\app\api\app\me\video-progress\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\me\video-progress\route.ts)
- [C:\Users\HP\Downloads\urocms\app\api\app\mocks\[id]\attempts\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\mocks\[id]\attempts\route.ts)
- [C:\Users\HP\Downloads\urocms\app\api\app\me\mock-attempts\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\me\mock-attempts\route.ts)
- [C:\Users\HP\Downloads\urocms\app\api\app\viva-attempts\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\viva-attempts\route.ts)
- [C:\Users\HP\Downloads\urocms\app\api\app\me\viva-attempts\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\me\viva-attempts\route.ts)
- [C:\Users\HP\Downloads\urocms\app\api\app\me\progress\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\me\progress\route.ts)

## Auth Requirement

All progress APIs require a Firebase ID token:

```http
Authorization: Bearer <firebase_id_token>
```

The RN app must continue using the authenticated wrapper already used for protected app routes.

## Recommended RN Integration Scope

The RN app should integrate progress in four parts:

1. video watch progress
2. mock attempt submission and history
3. viva attempt submission and history
4. dashboard progress summary

## 1. Video Progress Integration

### Save Video Progress

Endpoint:

- `POST /api/app/videos/:id/progress`

Purpose:

- save where the user stopped watching
- save total watched duration
- mark completion
- update dashboard counters

### Request Body

```json
{
  "lastPositionSeconds": 420,
  "watchedSeconds": 840,
  "durationSeconds": 1200,
  "completed": false,
  "bookmarked": false
}
```

### Notes

- `durationSeconds` is required and must be greater than `0`
- `completed` is optional because the backend will also mark completion automatically at `>= 90%`
- `bookmarked` is currently stored on the video progress record, but full bookmark flows are still pending

### Response Shape

```json
{
  "success": true,
  "progress": {
    "videoId": "video_123",
    "watchedSeconds": 840,
    "lastPositionSeconds": 420,
    "durationSeconds": 1200,
    "percentComplete": 70,
    "completed": false,
    "bookmarked": false,
    "lastWatchedAt": "2026-05-16T..."
  }
}
```

### When RN Should Save Progress

RN should call this endpoint:

- when video starts
- every 15 to 30 seconds while watching
- on pause
- on seek
- when app goes to background
- on video completion

### Recommended RN Rule

Do not call this API every second.

Use throttled saves so the app remains efficient and backend writes stay controlled.

### Fetch Video Progress History

Endpoint:

- `GET /api/app/me/video-progress`

Purpose:

- resume watched videos
- build continue-watching rails
- show completed vs in-progress videos

### Response Shape

```json
{
  "count": 3,
  "items": [
    {
      "id": "video_123",
      "videoId": "video_123",
      "sectionId": "section_1",
      "title": "Introduction",
      "durationSeconds": 1200,
      "watchedSeconds": 840,
      "lastPositionSeconds": 420,
      "percentComplete": 70,
      "completed": false,
      "bookmarked": false,
      "lastWatchedAt": "2026-05-16T...",
      "watchSessionsCount": 1,
      "updatedAt": "2026-05-16T..."
    }
  ]
}
```

## 2. Mock Progress Integration

### Submit Mock Attempt

Endpoint:

- `POST /api/app/mocks/:id/attempts`

Purpose:

- keep admin-side attempt summary on the mock
- store per-user attempt history
- update candidate stats

### Request Body

```json
{
  "marks": 72,
  "correctCount": 18,
  "totalQuestions": 25,
  "timeTakenSeconds": 1800
}
```

### Notes

- `marks` is required
- `correctCount`, `totalQuestions`, and `timeTakenSeconds` are optional but strongly recommended
- backend derives user identity from token, not body

### Response Shape

```json
{
  "success": true,
  "attemptsCount": 4,
  "attempt": {
    "candidate": {
      "uid": "uid_123",
      "name": "John Doe",
      "email": "john@example.com"
    },
    "marks": 72,
    "createdAt": "2026-05-16T..."
  }
}
```

### Fetch Mock Attempt History

Endpoint:

- `GET /api/app/me/mock-attempts`

### Response Shape

```json
{
  "count": 4,
  "items": [
    {
      "id": "attempt_1",
      "mockId": "mock_123",
      "quizId": "quiz_123",
      "type": "mock",
      "score": 72,
      "correctCount": 18,
      "totalQuestions": 25,
      "percent": 72,
      "timeTakenSeconds": 1800,
      "submittedAt": "2026-05-16T..."
    }
  ]
}
```

### RN Usage

Use this for:

- recent mock history
- mock result list
- average and best score displays

## 3. Viva Progress Integration

### Submit Viva Attempt

Endpoint:

- `POST /api/app/viva-attempts`

### Request Body

```json
{
  "caseId": "case_123",
  "mode": "Fast and Furious",
  "report": {
    "summary": "Good pace, missed one critical keyword."
  },
  "score": 8,
  "durationSeconds": 600
}
```

### Notes

- `caseId` is required
- `mode`, `report`, `score`, and `durationSeconds` should be sent when available
- user identity is derived from the token

### Response Shape

```json
{
  "success": true
}
```

### Fetch Viva Attempt History

Endpoint:

- `GET /api/app/me/viva-attempts`

### Response Shape

```json
{
  "count": 2,
  "items": [
    {
      "id": "attempt_1",
      "caseId": "case_123",
      "mode": "Fast and Furious",
      "report": {
        "summary": "Good pace, missed one critical keyword."
      },
      "score": 8,
      "durationSeconds": 600,
      "submittedAt": "2026-05-16T..."
    }
  ]
}
```

### RN Usage

Use this for:

- viva history page
- latest viva activity
- score/report archive

## 4. Dashboard Progress Summary

### Fetch Candidate Progress Summary

Endpoint:

- `GET /api/app/me/progress`

Purpose:

- top-level dashboard
- continue watching section
- recent mock history
- recent viva activity
- overall stats counters

### Response Shape

```json
{
  "stats": {
    "videosStarted": 5,
    "videosCompleted": 2,
    "totalWatchMinutes": 83.5,
    "quizzesAttempted": 0,
    "mocksAttempted": 3,
    "grandMocksAttempted": 1,
    "vivaAttempts": 2,
    "bookmarksCount": 0,
    "averageQuizScore": 0,
    "averageMockScore": 71.5,
    "bestMockScore": 80,
    "lastActivityAt": "2026-05-16T...",
    "streakDays": 0,
    "updatedAt": "2026-05-16T..."
  },
  "continueWatching": [],
  "recentMocks": [],
  "recentVivaAttempts": [],
  "summary": {
    "continueWatchingCount": 0,
    "recentMockCount": 0,
    "recentVivaCount": 0
  }
}
```

## Recommended RN Service Layer

Add these functions:

- `saveVideoProgress(videoId, payload)`
- `getMyVideoProgress()`
- `submitMockAttempt(mockId, payload)`
- `getMyMockAttempts()`
- `submitVivaAttempt(payload)`
- `getMyVivaAttempts()`
- `getMyProgressSummary()`

## Suggested RN Types

```ts
export type VideoProgressItem = {
  id: string;
  videoId: string;
  sectionId?: string | null;
  title?: string;
  durationSeconds: number;
  watchedSeconds: number;
  lastPositionSeconds: number;
  percentComplete: number;
  completed: boolean;
  bookmarked: boolean;
  lastWatchedAt: string;
  watchSessionsCount: number;
  updatedAt: string;
};

export type MockAttemptItem = {
  id: string;
  mockId: string;
  quizId?: string | null;
  type: "mock" | "grand-mock";
  score: number;
  correctCount?: number | null;
  totalQuestions?: number | null;
  percent?: number | null;
  timeTakenSeconds?: number | null;
  submittedAt: string;
};

export type VivaAttemptItem = {
  id: string;
  caseId: string;
  mode: "Calm and Composed" | "Fast and Furious";
  report?: unknown;
  score?: number | null;
  durationSeconds?: number | null;
  submittedAt: string;
};

export type CandidateStats = {
  videosStarted: number;
  videosCompleted: number;
  totalWatchMinutes: number;
  quizzesAttempted: number;
  mocksAttempted: number;
  grandMocksAttempted: number;
  vivaAttempts: number;
  bookmarksCount: number;
  averageQuizScore: number;
  averageMockScore: number;
  bestMockScore: number;
  lastActivityAt?: string | null;
  streakDays: number;
  updatedAt: string;
};
```

## Suggested RN Fetch Examples

```ts
export async function saveVideoProgress(
  videoId: string,
  payload: {
    lastPositionSeconds: number;
    watchedSeconds: number;
    durationSeconds: number;
    completed?: boolean;
    bookmarked?: boolean;
  }
) {
  return apiFetch(`/api/app/videos/${videoId}/progress`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getMyVideoProgress() {
  return apiFetch("/api/app/me/video-progress");
}

export async function getMyProgressSummary() {
  return apiFetch("/api/app/me/progress");
}

export async function getMyMockAttempts() {
  return apiFetch("/api/app/me/mock-attempts");
}

export async function getMyVivaAttempts() {
  return apiFetch("/api/app/me/viva-attempts");
}
```

## Recommended RN UX Rules

### Continue Watching

Use `GET /api/app/me/progress` first for the dashboard rail.

If a dedicated continue-watching page is needed, use:

- `GET /api/app/me/video-progress`

Sort by:

- `lastWatchedAt desc`

### Video Resume

When opening a video:

1. load the user progress item if present
2. seek to `lastPositionSeconds`
3. continue auto-saving progress while watching

### Mock Result History

Show:

- score
- percent
- date
- attempt type
- time taken

### Viva History

Show:

- case title
- mode
- score
- report summary
- attempted date

## Error Handling

### `401 Unauthorized`

Means:

- token missing
- token expired
- session invalid

RN action:

- refresh token or force login

### `403 Forbidden`

Means:

- route is locked by tier policy

Examples:

- mock submission for non-paid user
- viva access for non-paid user

RN action:

- show upgrade CTA

### `400 Bad Request`

Usually means payload is incomplete or invalid.

Examples:

- missing `durationSeconds` on video progress
- missing `marks` on mock attempt
- missing `caseId` on viva attempt

## Known Limitations Right Now

These are not fully implemented yet:

- quiz attempt history
- bookmarks collection and APIs
- dashboard recent-activity feed across all modules
- streak logic
- topic weakness analytics

RN should not build against those assumptions yet.

## Recommended Implementation Order For RN

1. integrate `GET /api/app/me/progress`
2. integrate video save + resume
3. integrate mock attempt submit + history
4. integrate viva attempt submit + history
5. add local client-side progress cache for smoother UX
6. wait for quiz/bookmark APIs before building those views

## Expected Product Outcome

After this patch, the RN app should be able to:

- resume videos from the correct timestamp
- show in-progress vs completed video learning
- show mock history and scores
- show viva history and reports
- power a real candidate dashboard instead of only static module cards

This is the current usable phase-1 progress contract for mobile integration.
