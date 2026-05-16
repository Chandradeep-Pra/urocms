# RN Plan-Based Access Patch

## Objective

Patch the React Native app and supporting backend flow so that access is no longer driven only by `free` vs `paid`.

Instead, the RN app should:

- fetch the current user's assigned plan
- understand what content is included in that plan
- allow access only to included content
- lock everything else

This patch should preserve the current tier model for onboarding and fallback, while moving actual paid-content gating to the user's assigned plan.

## Current Problem

Right now the app access model is still mostly tier-based.

Current backend behavior:

- `guest`
  - locked
- `free`
  - chapter quiz preview
  - weekly mock preview
- `paid`
  - broad unlock across quizzes, mocks, viva, and paid videos

This logic currently comes from:

- [C:\Users\HP\Downloads\urocms\lib\appAccess.ts](C:\Users\HP\Downloads\urocms\lib\appAccess.ts)
- [C:\Users\HP\Downloads\urocms\app\api\app\access\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\access\route.ts)

The issue is:

- a `paid` user is treated as globally entitled
- the RN app does not know which exact chapters, videos, quizzes, mocks, or viva cases belong to that user
- custom plans created in `Plan Creator` are not yet driving app access

## Desired Outcome

For each authenticated user, the RN app should know:

- the user's current tier
- the user's assigned `activePlanId`
- the resolved plan details
- the exact included content ids and access scopes
- the expiry state of the plan

Then the RN app should:

- show accessible content normally
- show non-included content as locked
- keep guest/free preview logic only as fallback for users with no paid plan

## Existing Plan Data Shape

Current pricing plans already support:

- direct content selection
- scope-based access

From [C:\Users\HP\Downloads\urocms\lib\server\pricingService.ts](C:\Users\HP\Downloads\urocms\lib\server\pricingService.ts):

### `selectedContent`

```ts
{
  chapterIds: string[];
  videoIds: string[];
  quizIds: string[];
  mockIds: string[];
  vivaCaseIds: string[];
}
```

### `accessScopes`

```ts
{
  courseIds: string[];
  chapterGroupIds: string[];
  videoSectionIds: string[];
  vivaFolderIds: string[];
}
```

This is already enough to support custom plan-driven access.

## Recommended Access Model

Use a two-layer access decision:

### Layer 1: User Tier

Still needed for:

- guest onboarding
- free preview rules
- broad paid/non-paid classification

### Layer 2: Active Plan

Needed for:

- exact paid entitlement
- custom pricing plans
- content-level access
- plan expiry handling

## Recommended User Document Additions

The RN app needs these fields on the user profile payload:

```ts
{
  tier: "guest" | "free" | "paid";
  activePlanId?: string | null;
  activePlanStatus?: "active" | "expired" | "none";
  planActivatedAt?: string | null;
  planExpiresAt?: string | null;
}
```

Recommended source:

`users/{uid}`

## Recommended New Backend Response Shape

The RN app should receive a resolved access object from a single endpoint.

Recommended endpoint:

- `GET /api/app/access`

This route already exists, but it currently returns only tier-based access policy.

It should be extended to return:

```ts
{
  valid: true;
  tier: "guest" | "free" | "paid";
  profile: {
    uid: string;
    email: string | null;
    name: string | null;
    googleAccessEmail: string | null;
    activeCourseIds: string[];
    activePlanId?: string | null;
    activePlanStatus?: "active" | "expired" | "none";
    planExpiresAt?: string | null;
  };
  policy: {
    freeChapterPreviewLimit: number;
    freeWeeklyMockPreviewLimit: number;
    modules: Array<unknown>;
  };
  plan: {
    id: string;
    name: string;
    expiryMonths: number;
    vivaMinutes?: number;
    selectedContent: {
      chapterIds: string[];
      videoIds: string[];
      quizIds: string[];
      mockIds: string[];
      vivaCaseIds: string[];
    };
    accessScopes: {
      courseIds: string[];
      chapterGroupIds: string[];
      videoSectionIds: string[];
      vivaFolderIds: string[];
    };
  } | null;
  entitlements: {
    chapters: string[];
    videos: string[];
    quizzes: string[];
    mocks: string[];
    vivaCases: string[];
    courses: string[];
    chapterGroups: string[];
    videoSections: string[];
    vivaFolders: string[];
  };
}
```

## Recommended Backend Resolution Logic

When `GET /api/app/access` runs:

1. authenticate user
2. load user document
3. determine tier
4. read `activePlanId`
5. if no active plan:
   - return tier-only fallback policy
6. if active plan exists:
   - load `pricingPlans/{activePlanId}`
   - verify:
     - plan exists
     - plan is active
     - user plan is not expired
7. return:
   - plan payload
   - normalized entitlements

## Important Rule

Plan access should not replace guest/free base logic completely.

Recommended behavior:

- `guest`
  - no plan-based unlock
- `free`
  - if no plan: use preview logic
  - if free user somehow has assigned free-access plan: allow only plan items
- `paid`
  - if active plan exists: allow only plan items
  - if paid but no plan exists: either fall back to broad paid unlock temporarily or mark this as review

## Recommendation On Fallback

Mark this for product decision:

- `x` paid user with no assigned plan

Suggested default:

- short-term fallback to current paid behavior
- long-term require active plan assignment

## RN App Patch Strategy

The RN app should stop assuming:

- `tier === "paid"` means full access to everything

Instead it should use:

- `tier` for broad state
- `plan + entitlements` for exact content locking

## RN Boot Flow

### Current

RN app calls:

- `POST /api/validate-user`
- optionally `GET /api/app/access`

### Patched

RN app should call:

1. `POST /api/validate-user`
2. `GET /api/app/access`

Then store:

- `tier`
- `activePlanId`
- `activePlanStatus`
- `plan`
- `entitlements`

## RN Local State Shape

Recommended client state:

```ts
type Entitlements = {
  chapters: string[];
  videos: string[];
  quizzes: string[];
  mocks: string[];
  vivaCases: string[];
  courses: string[];
  chapterGroups: string[];
  videoSections: string[];
  vivaFolders: string[];
};

type AppAccessSnapshot = {
  tier: "guest" | "free" | "paid";
  activePlanId?: string | null;
  activePlanStatus?: "active" | "expired" | "none";
  planExpiresAt?: string | null;
  plan: null | {
    id: string;
    name: string;
    expiryMonths: number;
    vivaMinutes?: number;
  };
  entitlements: Entitlements;
};
```

## RN Content Gating Rules

### Videos

A video is accessible if any of these are true:

1. user is `guest`
   - no access unless product explicitly allows public content
2. user is `free`
   - existing free/public video logic allows it
3. user has plan and:
   - `video.id` is in `entitlements.videos`
   - or `video.sectionId` is in `entitlements.videoSections`
   - or the parent course is in `entitlements.courses`

Otherwise:

- lock the video card

### Chapter Quizzes

A chapter quiz is accessible if:

- its quiz id is in `entitlements.quizzes`
- or its chapter id is in `entitlements.chapters`
- or its parent group id is in `entitlements.chapterGroups`
- or its parent course is in `entitlements.courses`

If no plan applies:

- fall back to free preview rules for `free`

### Mocks and Grand Mocks

A mock is accessible if:

- `mock.id` is in `entitlements.mocks`
- or its parent course is in `entitlements.courses`

If no plan applies:

- fall back to current free preview behavior for `free`

### AI Viva Cases

A viva case is accessible if:

- `case.id` is in `entitlements.vivaCases`
- or its folder is in `entitlements.vivaFolders`
- or its course is in `entitlements.courses`

If no plan applies:

- current `paid-only` behavior remains

## Recommended RN Helper Functions

```ts
export function hasPlanEntitlement(ids: string[] | undefined, targetId?: string | null) {
  if (!targetId) return false;
  return Array.isArray(ids) && ids.includes(targetId);
}

export function canAccessVideo(
  access: AppAccessSnapshot,
  video: { id: string; sectionId?: string | null; accessTier?: "free" | "paid" }
) {
  if (access.tier === "guest") return false;

  const planApplies = access.activePlanStatus === "active" && access.plan;
  if (!planApplies) {
    return access.tier === "paid" || video.accessTier !== "paid";
  }

  return (
    hasPlanEntitlement(access.entitlements.videos, video.id) ||
    hasPlanEntitlement(access.entitlements.videoSections, video.sectionId)
  );
}
```

Equivalent helpers should exist for:

- `canAccessQuiz`
- `canAccessMock`
- `canAccessVivaCase`
- `canAccessCourse`

## UI Behavior

### Accessible Content

Show normally:

- open
- play
- attempt
- continue

### Locked Content

Show:

- lock icon
- message:
  - `Not included in your current plan`
- optional CTA:
  - `Upgrade plan`
  - `View pricing`

### Expired Plan

Show:

- `Your plan has expired`
- disable paid plan content
- allow only fallback free-tier content if applicable

## Recommended Backend Patch Scope

### 1. Extend `GET /api/app/access`

Add:

- user active plan metadata
- resolved plan payload
- resolved entitlements

### 2. Add Shared Plan Resolution Helper

Recommended file:

- `lib/server/appPlanAccess.ts`

Responsibilities:

- load user active plan
- verify plan active/expiry state
- normalize `selectedContent`
- normalize `accessScopes`
- return one entitlement snapshot

### 3. Patch App Content Routes

Eventually, the app routes should not only rely on tier.

These routes should also enforce plan entitlements:

- `GET /api/app/videos/library`
- `GET /api/app/videos/:id/play`
- `GET /api/app/quizzes`
- `GET /api/app/quizzes/:id`
- `GET /api/app/mocks`
- `GET /api/app/mocks/:id`
- `POST /api/app/mocks/:id/attempts`
- `GET /api/app/viva-cases`
- `POST /api/app/viva-attempts`

## Enforcement Recommendation

Do not rely on RN app locking alone.

The backend must also enforce plan entitlements.

Reason:

- RN UI can hide locked content
- but direct API calls must still be blocked server-side

## Recommended Backend Decision Order

For any app content route:

1. verify auth
2. load tier
3. load plan snapshot
4. check plan entitlement
5. if entitled:
   - return full content
6. else if free-tier preview applies:
   - return preview content
7. else:
   - return `403`

## Migration Strategy

### Phase A

Low-risk patch:

- extend `GET /api/app/access`
- return plan + entitlements
- patch RN app UI locking

This gives visibility without breaking all routes immediately.

### Phase B

Backend enforcement:

- patch content routes one by one to enforce entitlements

Recommended order:

1. videos
2. viva cases
3. mocks
4. quizzes

### Phase C

Admin/user management:

- ensure assigning a paid plan writes:
  - `activePlanId`
  - `activePlanStatus`
  - `planActivatedAt`
  - `planExpiresAt`

## Expectations From This Patch

After this patch:

- RN app will know exactly what the user owns
- plan-based paid access becomes deterministic
- custom plans from `Plan Creator` become meaningful in the app
- non-included content stays locked
- backend and frontend access logic become aligned

## Items That Need Review

- `x` whether paid users with no active plan should keep full fallback access temporarily
- `x` whether course-level entitlement alone should unlock all nested content automatically
- `x` whether plan expiry should immediately downgrade access or use a grace period

## Recommended Next Backend Task

Implement a shared resolver plus patch this route first:

- `GET /api/app/access`

That will let the RN team integrate the new access model immediately, even before all content routes are fully plan-enforced.
