# Course Section Access And AI Viva Credit Implementation Guide

## Objective

Move course distribution from a broad `paid = unlocked` model to a backend-driven entitlement model that drills down from:

`course -> section -> linked content item`

This allows:

- full course access
- full access to a single section
- partial access to selected content inside a section
- AI viva access controlled by minute credits

## Desired Outcomes

- Learners only unlock the exact content granted through their purchased/assigned course access.
- A learner can be assigned:
  - full course access
  - full access to one or more sections
  - partial access to selected items inside a section
- AI viva sections can carry minute credit.
- If a learner is granted access to an AI viva section, their email is added to the linked viva cases.
- RN app shows:
  - unlocked items with normal CTA
  - locked items with yellow lock icon + green `Unlock` chip
  - AI viva remaining minutes at the top of the viva screen

## Core Data Model

### Course document

Each course now supports:

```ts
memberAccessGrants: Array<{
  userId: string;
  name: string;
  email: string;
  sectionGrants: Array<{
    sectionId: string;
    accessMode: "full" | "partial";
    contentIds: string[];
    vivaMinutes: number;
  }>;
}>
```

### User document

Users continue to store:

```ts
activeCourseIds: string[]
```

Additionally, AI viva usage is stored as:

```ts
vivaMinutesUsed: number
```

`activeCourseIds` should be treated as a discoverability/ownership hint, not as automatic full-course unlock. Full unlock must be resolved from course membership and section grants.

## Backend Resolution Rules

### Full course access

A learner gets full course unlock when:

- their user id is in `course.memberUserIds`
- or their plan grants the course
- or it is a free signed-in course

### Partial course access

A learner gets partial course unlock when:

- they have one or more `memberAccessGrants.sectionGrants`
- or plan/content entitlements unlock only part of the course

### Section access

For each section:

- `full` if the learner has full course access
- `full` if the learner has a matching section grant with `accessMode = "full"`
- `partial` if the learner has a matching section grant with `accessMode = "partial"`
- `locked` otherwise

### Linked content access

For linked content inside a section:

- unlocked if full course access is present
- unlocked if matching full section grant is present
- unlocked if the content id is included in a partial section grant
- locked otherwise

## AI Viva Credit Rules

AI viva access can be granted by:

- plan viva minutes
- section viva minutes

Resolved viva credit snapshot:

```ts
{
  totalMinutes: number;
  usedMinutes: number;
  remainingMinutes: number;
  percentRemaining: number;
}
```

Usage rule:

- when an AI viva attempt is submitted with `durationSeconds`
- backend increments `users/{uid}.vivaMinutesUsed`
- minutes are rounded up using `Math.ceil(durationSeconds / 60)`

If `remainingMinutes <= 0` and the learner depends on viva-minute-based access, the viva remains visible but becomes locked.

## AI Viva Email Propagation

When a course is saved:

- full course members are added to all linked AI viva cases in that course
- section-granted learners are added only to the AI viva cases included in the granted section
- for partial grants, only the selected viva case ids are added

This is handled through the existing course-managed viva allow-list flow so manual allow-lists are preserved.

## RN App Contract

RN should consume backend access metadata only.

### Course list

Each course and section should include:

```ts
access: {
  allowed: boolean;
  mode: "full" | "partial" | "locked";
  reason?: string | null;
}
```

### Content items

Each linked item should include item-level access metadata:

- videos: `full | locked`
- quizzes/mocks: `full | preview | locked`
- viva cases: `full | public | locked`

### AI viva screen

RN should display:

- remaining viva minutes at the top as a horizontal progress bar
- all viva cases in the catalog
- locked cases with yellow lock icon + green `Unlock` chip

## Admin Workflow

Inside course detail:

1. Add the normal full-course members in `Course Members`
2. Add section-level learners in `Section Access Grants`
3. For each learner and section choose:
   - `No access`
   - `Full section access`
   - `Partial item access`
4. If partial, choose the allowed linked items
5. If the section is `AI Vivas`, assign viva minutes

## Implementation Steps

1. Extend course schema with `memberAccessGrants`
2. Normalize and persist section grants in course service
3. Update access resolver to distinguish:
   - full course
   - partial section
   - linked item grants
4. Return section/item access metadata from app APIs
5. Return `vivaCredit` in app access and viva APIs
6. Deduct viva minutes on attempt submit
7. Add admin UI for section grants and viva minutes
8. Update RN app to:
   - respect backend access metadata
   - route locked taps to premium/explore
   - show viva credit bar

## Verification Checklist

- learner with full course membership sees all course content unlocked
- learner with only one section grant sees only that section unlocked
- learner with partial section grant sees only selected linked items unlocked
- paid learner without course/section grant does not get unrelated paid course content
- AI viva learner with granted section appears in linked viva case allow-list
- viva minutes decrease after viva submission with duration
- RN viva screen shows the remaining minutes bar
- locked RN items use yellow lock icon + green `Unlock` chip
