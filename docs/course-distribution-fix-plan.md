# Course Distribution Fix Plan

## Objective

Make course access deterministic across the Next.js backend and the RN app so that:

- learners only get full access to the exact courses they purchased or were assigned
- partial course access can be granted through subsection-linked content entitlements
- paid tier alone does not unlock unrelated course content
- the backend returns explicit `full`, `preview`, or `locked` access metadata for each content item
- the RN app renders unlocked content normally and locked content with lock treatment plus `/premium-explore` routing

## Core Problem

The current system mixes two access models:

1. `tier-based` access
   - many APIs still treat `paid` as a global unlock
   - this is what allows a paid user to open unrelated paid videos

2. `course/plan-based` access
   - courses, active course memberships, and plan entitlements already exist
   - but several content APIs do not drill down into those entitlements before responding

This mismatch makes the app inconsistent:

- course cards can look locked while detail APIs still open content
- paid users can access content outside their purchased course
- subsection-specific access cannot be represented cleanly end to end

## Target Access Model

### Full course access

A learner gets full access to a course when any of these are true:

- the course is `free` and the learner is signed in
- the learner is explicitly assigned to the course via `activeCourseIds`
- the learner’s active plan includes the course in `entitlements.courses`

### Subsection/content access

A learner can also get access to part of a course without owning the full course when their active plan includes:

- specific videos
- specific quizzes
- specific mocks
- specific viva cases
- video sections
- chapter groups
- viva folders

In this case:

- the course still shows up in the RN app
- only the entitled items/subsections appear unlocked
- the rest stay locked

### Preview rules

Preview remains supported for quiz-style content only:

- chapter quizzes: preview
- mocks / grand mocks: preview

But on the course screen:

- preview-only content should still render as locked
- only `full` access should look unlocked inside a purchased course experience

## Execution Plan

### Step 1. Create one backend entitlement resolver

Build a shared server helper that:

- loads the user’s active plan access snapshot
- loads app-visible courses
- computes full-course access
- computes content-level access for:
  - videos
  - quizzes
  - mocks
  - viva cases

Output should support:

- `allowed`
- `mode`
  - `full`
  - `preview`
  - `locked`
- `reason`
- related course ids when helpful

### Step 2. Fix course API output

Update `/api/app/courses` so every course returned to RN includes:

- course access metadata
- section access metadata
- linked content snapshots

This route should expose all app-visible courses, but mark each one correctly:

- full
- partial
- locked

### Step 3. Fix content catalog APIs

Update these APIs to use the shared entitlement resolver:

- `/api/app/videos/library`
- `/api/app/quizzes`
- `/api/app/mocks`
- `/api/app/viva-cases`

They should return all app-visible items needed for structure browsing, but with correct access metadata attached.

### Step 4. Fix protected detail/play routes

Update these routes so they no longer rely on paid tier alone:

- `/api/app/videos/[id]/play`
- `/api/app/quizzes/[id]`
- `/api/app/mocks/[id]`
- viva start/attempt routes if needed

Rules:

- `full` access opens the content normally
- `preview` access returns only preview-safe content for quiz/mock types
- `locked` access rejects access

### Step 5. Patch RN course rendering

Update RN consumers so:

- course cards and subsection items use backend access metadata
- locked items show lock icon + unlock chip
- tapping locked items routes to `/premium-explore`
- course items with only preview access still render as locked on the course screen

### Step 6. Preserve preview behavior outside course flow

Keep quiz/mock preview behavior in discovery/test flows where appropriate, while ensuring:

- preview is never mistaken for full course entitlement
- paid tier does not auto-upgrade unrelated course content

### Step 7. Verify with entitlement scenarios

Test these scenarios:

1. free user + free course
2. paid user + no assigned course
3. paid user + one assigned course only
4. plan with only one subsection/content slice
5. public viva case
6. locked video inside a course the user can see but does not own

## Expected Outcome

After this fix:

- the backend becomes the single source of truth for content access
- the RN app only reflects backend access state
- full course access, subsection access, and preview access stop conflicting
- paid users no longer gain unrelated content automatically
- the course experience becomes structurally visible but accurately locked where needed
