# Candidate Progress Journey

## Status Legend

- `✓` implemented
- `-` pending
- `x` needs review or redesign

## Objective

Build a unified candidate progress system for Urologics that can reliably answer:

- what content a candidate has consumed
- how far they progressed in each video
- which quizzes, mocks, and viva sessions they attempted
- how they scored over time
- what they bookmarked for revision
- what should be shown next on their dashboard

The system should support both web and React Native surfaces, while keeping the backend model simple enough to evolve without rewriting major modules later.

## Goal

Create a single learner-progress backbone across:

- video courses
- chapter-wise quizzes
- weekly mocks
- grand mocks
- AI viva
- saved/bookmarked learning items

This backbone should power:

- student dashboard
- resume learning
- analytics and performance summaries
- weak-area detection
- leaderboards
- future recommendation systems

## Product Outcome

At the end of phase 1, every candidate should have a clear measurable journey inside the product:

- what they started
- what they completed
- what they paused midway
- what they attempted
- how they performed
- what they saved for later
- what they should do next

## Guiding Principles

1. Use the authenticated user as the only source of identity.
2. Keep detailed event records separate from dashboard summary records.
3. Prefer append/update records per content item instead of storing everything in one giant user document.
4. Use backend-validated writes only. Frontend must never choose another user's `uid`.
5. Optimize for product analytics and student experience first, not only admin reporting.

## Core Journey Stages

### 1. Candidate Enters The Platform

The user signs in as:

- `guest`
- `free`
- `paid`

We must immediately know:

- current tier
- active plan
- accessible modules
- onboarding completion state

This becomes the base profile used by all progress modules.

### 2. Candidate Consumes Learning Content

This includes:

- opening a course
- entering a chapter
- watching a video
- pausing a video
- resuming a video
- completing a video

This should update both:

- detailed progress record
- aggregate dashboard counters

### 3. Candidate Attempts Assessments

This includes:

- chapter quiz attempts
- weekly mock attempts
- grand mock attempts
- AI viva attempts

Each attempt should create a durable attempt record with score metadata and timestamps.

### 4. Candidate Saves Important Revision Points

This includes:

- bookmarking a video
- bookmarking a quiz question
- bookmarking a mock question
- bookmarking a viva case

This should support future revision workflows.

### 5. Candidate Reviews Their Progress

The candidate dashboard should show:

- continue watching
- latest scores
- average performance
- completed content
- saved items
- recent activity
- weak areas

## Recommended Data Architecture

Use three layers.

### Layer 1: User Identity

`users/{uid}`

Purpose:

- user profile
- access state
- plan state
- top-level learning identity

Suggested fields:

```ts
{
  uid: string;
  name: string | null;
  email: string | null;
  tier: "guest" | "free" | "paid" | "expired";
  activePlanId?: string | null;
  profileCompleted?: boolean;
  createdAt: string;
  updatedAt: string;
  lastSeenAt?: string;
}
```

### Layer 2: Detailed Progress Records

This is the source of truth.

#### Video Progress

`videoProgress/{uid}/items/{videoId}`

```ts
{
  videoId: string;
  sectionId?: string | null;
  title?: string;
  durationSeconds?: number;
  watchedSeconds: number;
  lastPositionSeconds: number;
  percentComplete: number;
  completed: boolean;
  bookmarked: boolean;
  lastWatchedAt: string;
  watchSessionsCount: number;
  updatedAt: string;
}
```

#### Quiz Attempts

`quizAttempts/{uid}/items/{attemptId}`

```ts
{
  quizId: string;
  chapterId?: string | null;
  score: number;
  correctCount: number;
  totalQuestions: number;
  percent: number;
  timeTakenSeconds?: number;
  submittedAt: string;
  answers?: Array<unknown>;
}
```

#### Mock Attempts

`mockAttempts/{uid}/items/{attemptId}`

```ts
{
  mockId: string;
  quizId?: string | null;
  type: "mock" | "grand-mock";
  score: number;
  correctCount?: number;
  totalQuestions?: number;
  percent?: number;
  timeTakenSeconds?: number;
  submittedAt: string;
}
```

#### Viva Attempts

`vivaAttempts/{uid}/items/{attemptId}`

```ts
{
  caseId: string;
  mode: "Calm and Composed" | "Fast and Furious";
  score?: number | null;
  report?: string | null;
  durationSeconds?: number | null;
  submittedAt: string;
}
```

#### Bookmarks

`bookmarks/{uid}/items/{bookmarkId}`

```ts
{
  type: "video" | "quiz-question" | "mock-question" | "viva-case";
  targetId: string;
  parentId?: string | null;
  title?: string | null;
  notes?: string | null;
  createdAt: string;
}
```

### Layer 3: Aggregated Dashboard State

`userStats/{uid}`

Purpose:

- fast dashboard reads
- quick summaries
- easy access for mobile app home screen

Suggested fields:

```ts
{
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
  lastActivityAt?: string;
  streakDays?: number;
  updatedAt: string;
}
```

## Phase 1 Features

Phase 1 should focus on the minimum system that produces meaningful student progress.

### ✓ 1. Video Progress Tracking

Features:

- open video
- resume from last position
- save current watch progress
- completed status at 90 percent watched
- recently watched list

User value:

- no lost progress
- better continuity across devices

### - 2. Quiz Attempt Tracking

Features:

- record quiz result
- save score, percent, and time taken
- show latest and best attempts

User value:

- clear chapter-wise preparation record

### ✓ 3. Mock Attempt Tracking

Features:

- record mock submission
- store marks, totals, time, and attempt type
- sync attempt summary to mock document for admin view
- store detailed per-user attempt for dashboard and analytics

User value:

- track performance across high-value assessments

### ✓ 4. AI Viva Attempt Tracking

Features:

- store viva attempt
- case id
- mode
- report
- optional score

User value:

- track viva practice frequency and quality

### - 5. Bookmarking

Features:

- bookmark videos
- bookmark questions
- bookmark viva cases
- show saved items in dashboard/revision view

User value:

- easier revision workflow

### ✓ 6. Dashboard Summary Endpoint

Features:

- fetch fast aggregate summary
- recent activity
- continue watching
- latest quiz/mock/viva actions

User value:

- one clear view of progress

## Phase 1 Execution Plan

### ✓ Step 1. Finalize Schemas

Create and agree on:

- `videoProgress`
- `quizAttempts`
- `mockAttempts`
- `vivaAttempts`
- `bookmarks`
- `userStats`

Deliverables:

- Firestore collection structure
- TypeScript types
- server-side validators

### ✓ Step 2. Build Shared Auth-Aware Progress Helpers

Create reusable backend helpers for:

- resolving authenticated user
- validating write payloads
- generating timestamps
- updating aggregate stats safely

Deliverables:

- shared server utilities under `lib/server`
- consistent error shape across progress APIs

### ✓ Step 3. Implement Video Progress APIs

Recommended endpoints:

- `POST /api/app/videos/:id/progress`
- `GET /api/app/me/video-progress`

Write behavior:

- upsert per-video progress
- calculate `percentComplete`
- set `completed` when threshold is reached
- update `userStats`

Frontend behavior:

- send progress every 15 to 30 seconds
- also send on pause, seek, background, and complete

### - Step 4. Implement Quiz Attempt APIs

Recommended endpoints:

- `POST /api/app/quizzes/:id/attempt`
- `GET /api/app/me/quiz-attempts`

Write behavior:

- append new attempt
- calculate percentage
- update quiz counters in `userStats`

### ✓ Step 5. Upgrade Mock Attempt Flow

There is already mock attempt support. Phase 1 should standardize it further.

Required outcome:

- keep admin-facing mock attempt summary on `mocks/{mockId}`
- also write per-user detailed attempt into `mockAttempts/{uid}`
- update `userStats`

Recommended endpoints:

- keep `POST /api/app/mocks/:id/attempts`
- extend it to write both summary and user detail

### ✓ Step 6. Implement Viva Attempt Tracking

Recommended endpoints:

- keep `POST /api/app/viva-attempts`
- add `GET /api/app/me/viva-attempts`

Write behavior:

- persist case, mode, score/report
- increment `vivaAttempts` in `userStats`

### - Step 7. Implement Bookmark APIs

Recommended endpoints:

- `POST /api/app/bookmarks`
- `DELETE /api/app/bookmarks/:id`
- `GET /api/app/me/bookmarks`

Write behavior:

- save item type and target
- update `bookmarksCount` in `userStats`

### ✓ Step 8. Build Dashboard Summary API

Recommended endpoint:

- `GET /api/app/me/progress`

Response should include:

- user stats summary
- continue watching list
- last 5 recent activities
- latest mock scores
- latest viva activity
- bookmarks count

### - Step 9. Add Frontend Instrumentation

Web and RN apps should both send progress events consistently.

Required tracking points:

- video open
- video progress update
- video complete
- quiz submit
- mock submit
- viva submit
- bookmark create/remove

### - Step 10. QA and Metrics Validation

Verify:

- repeated progress updates do not create duplicate records
- attempts are not double-counted
- dashboard stats stay in sync
- guest/free/paid access boundaries remain correct

## Recommended API Contract Summary

### Video

- `POST /api/app/videos/:id/progress`
- `GET /api/app/me/video-progress`

### Quiz

- `POST /api/app/quizzes/:id/attempt`
- `GET /api/app/me/quiz-attempts`

### Mock

- `POST /api/app/mocks/:id/attempts`
- `GET /api/app/me/mock-attempts`

### Viva

- `POST /api/app/viva-attempts`
- `GET /api/app/me/viva-attempts`

### Bookmarks

- `POST /api/app/bookmarks`
- `DELETE /api/app/bookmarks/:id`
- `GET /api/app/me/bookmarks`

### Dashboard

- `GET /api/app/me/progress`

## Expected Output From Phase 1

At the end of phase 1, the platform should reliably support:

- resume video learning from the correct timestamp
- see which videos are completed vs in-progress
- see quiz and mock history
- see latest scores and averages
- see viva usage history
- save and revisit bookmarks
- show an accurate dashboard summary for each user

## Expected Product Impact

### For Candidates

- stronger feeling of continuity
- better motivation through visible progress
- easier revision planning
- clearer understanding of weak and strong areas

### For Business

- stronger retention
- better paid-plan value perception
- better cohort analytics
- future readiness for recommendations, leaderboards, and interventions

### For Engineering

- one structured progress system instead of scattered feature-level storage
- reusable APIs across web and RN
- clear path to phase 2 analytics

## Phase 2 Direction

Once phase 1 is stable, phase 2 can include:

- streaks
- weak-topic intelligence
- recommendation engine
- performance trends over time
- cohort comparison
- leaderboards
- mentor-facing candidate progress views
- downloadable progress reports

## Risks To Control Early

1. Writing too much data too frequently from video progress updates.
2. Double-submission of quiz or mock attempts.
3. Trying to compute all dashboard data live on every page load.
4. Mixing access control logic with progress storage logic.
5. Keeping different progress rules across web and RN.

## Recommended Implementation Sequence

1. schema + types
2. shared progress helpers
3. video progress
4. quiz attempts
5. mock attempt unification
6. viva tracking
7. bookmarks
8. dashboard summary endpoint
9. frontend instrumentation
10. QA and analytics validation

## Expectation From This Plan

If executed in this order, Urologics will have a dependable candidate progress system that is:

- measurable
- scalable
- product-friendly
- mobile-friendly
- ready for premium analytics and learner personalization

This phase should not try to solve every future analytics need. It should establish a clean, trusted progress foundation that all later reporting and intelligence can build on.
