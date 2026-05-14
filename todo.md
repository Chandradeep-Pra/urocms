# Codebase Revamp Todo

## Purpose

This document turns [C:\Users\HP\Downloads\urocms\reiterate.md](C:\Users\HP\Downloads\urocms\reiterate.md) into an execution plan for this codebase.

It is a practical backlog for progressively improving:

- architecture
- code organization
- security
- performance
- pagination
- maintainability

without breaking the existing public/admin/app route contracts.

---

## Working Rules

### Rules to follow on every cleanup

1. Do not rewrite large features in one pass.
2. Do not change route paths unless explicitly planned.
3. Prefer extraction over mutation-heavy refactors.
4. Keep app behavior stable.
5. Secure routes before beautifying them.
6. If a change is risky or ambiguous, leave a note here before proceeding.

### Definition of progress

A cleanup task is considered complete when:

- file complexity is lower
- duplication is lower
- behavior is unchanged or safer
- tests/build still pass
- follow-up uncertainty is documented

---

## Priority Order

### P0

- secure admin/CMS APIs
- centralize auth and authorization
- stabilize route/service boundaries
- reduce high-risk oversized files

### P1

- frontend component extraction
- pagination on large GET routes
- entitlement and course-access normalization
- users/admin cleanup

### P2

- visual consistency improvements
- dead code removal
- performance tuning
- documentation refinement

---

## Phase 1: Security and Route Hygiene

### 1.1 Admin route audit

Goal:

- identify all `/api/*` routes used by dashboard/CMS that are not currently protected by server-side admin checks

- [x] Tasks:

- audit all routes under:
  - `app/api/courses/*`
  - `app/api/pricing-plans/*`
  - `app/api/videos/*`
  - `app/api/viva-cases/*`
  - `app/api/viva-folders/*`
  - `app/api/mocks/*`
  - `app/api/quizzes/*`
  - `app/api/questions/*`
  - `app/api/question-banks/*`
  - `app/api/daily-quiz/*`
  - `app/api/announcements`
  - `app/api/users/[id]`
- list which ones are:
  - publicly reachable and acceptable
  - publicly reachable and unsafe
  - app-facing and should stay learner accessible

- [x] Deliverable:

- explicit admin-only route inventory

Status note:

- initial audit completed
- confirmed that multiple CMS routes remain publicly reachable without server-side admin enforcement
- first secured slice chosen: `courses` admin module

### 1.2 Create shared admin guard

Goal:

- stop repeating ad hoc admin access assumptions

- [x] Tasks:

- create a reusable server-side admin guard helper in `lib/server`
- use one consistent pattern for:
  - allowlist check
  - auth failure response
  - forbidden response

- [x] Deliverable:

- one shared `requireAdmin` style helper

Status note:

- shared server helper added in `lib/server/adminAccess.ts`
- shared client helper added in `lib/client/adminApi.ts` so admin dashboard requests consistently send Firebase bearer tokens

### 1.3 Apply admin guard incrementally

Goal:

- secure admin routes without changing route paths

- [x] Tasks:

- start with mutation routes first:
  - `POST`
  - `PATCH`
  - `PUT`
  - `DELETE`
- then add protection to read-heavy admin-only GET routes

Order:

1. users `[x]`
2. courses `[x]`
3. pricing plans `[-]`
4. videos `[-]`
5. viva `[x]`
6. quizzes/questions `[x]`

Status note:

- completed for:
  - `app/api/courses/route.ts`
  - `app/api/courses/[id]/route.ts`
  - `app/api/courses/content-catalog/route.ts`
  - `app/api/courses/members-catalog/route.ts`
- course dashboard pages now use authenticated admin fetches
- completed for pricing mutations:
  - `app/api/pricing-plans` `POST`
  - `app/api/pricing-plans/[id]` `PATCH` and `DELETE`
  - `app/api/pricing-plans/presets` `POST`
  - `app/api/pricing-coupons` `POST`
  - `app/api/pricing-coupons/[id]` `PATCH` and `DELETE`
- plan creator writes now use authenticated admin fetches
- still pending in pricing:
  - decide whether `GET /api/pricing-plans` should remain public or be split into public/admin read models later
- completed for users mutations:
  - `app/api/users/[id]` `PATCH` and `DELETE`
- users dashboard mutations now use authenticated admin fetches
- completed for video admin routes used by dashboard:
  - `app/api/videos/videoSection` `GET` and `POST`
  - `app/api/videos/videoSection/[id]` `PATCH` and `DELETE`
  - `app/api/videos/videoItem` `GET` and `POST`
  - `app/api/videos/videoItem/[id]` `PATCH` and `DELETE`
  - `app/api/videos/videoItem/[id]/play` `GET`
  - `app/api/videos/videoItem/[id]/sync-storage` `POST`
  - `app/api/videos/library` `GET`
  - `app/api/videos/drive-folders` `GET`
  - `app/api/videos/drive-library` `GET`
  - `app/api/videos/drive-permissions` `GET`, `POST`, `PATCH`, `DELETE`
- video dashboard and shared video admin client now use authenticated admin fetches
- pending video security follow-up:
  - review `app/api/videos/videoItem/[id]/stream` separately because raw media endpoints do not fit bearer-header protection as cleanly as dashboard JSON routes
- completed for viva admin routes:
  - `app/api/viva-cases` `GET` and `POST`
  - `app/api/viva-cases/[id]` `GET`, `PATCH`, and `DELETE`
  - `app/api/viva-folders` `GET` and `POST`
- AI viva dashboard pages now use authenticated admin fetches
- completed for quizzes, questions, question-banks:
  - `app/api/quizzes` `GET` and `POST`
  - `app/api/quizzes/[id]` `GET`, `PUT`, and `DELETE`
  - `app/api/questions` `GET` and `POST`
  - `app/api/questions/[id]` `PUT` and `DELETE`
  - `app/api/question-banks` `GET` and `POST`
  - `app/api/question-banks/[id]` `GET`, `PATCH`, and `DELETE`
- question bank, question creator, question detail, and quiz builder screens now use authenticated admin fetches
- completed for mocks and announcement writes:
  - `app/api/mocks` `GET` and `POST`
  - `app/api/mocks/[id]` `GET`, `PATCH`, and `DELETE`
  - `app/api/mocks/[id]/attempts` `POST`
  - `app/api/announcements` `POST`
- grand mocks and announcement dashboard pages now use authenticated admin fetches
- remaining explicit edge decisions:
  - `GET /api/pricing-plans` is still mixed-purpose and should be split into public/admin read models later
  - `app/api/videos/videoItem/[id]/stream` still needs a dedicated media-auth decision

### 1.4 App route consistency audit

Goal:

- ensure all `/api/app/*` routes use the same authentication and entitlement resolution style

- [x] Tasks:

- verify all use `requireAppUser(...)`
- verify no app route trusts caller-supplied email/name identity
- verify `403` responses are consistent
- verify access metadata shape is consistent

Status note:

- audited active `/api/app/*` routes
- verified current app routes use `requireAppUser(...)`
- tightened server-derived identity in:
  - `app/api/app/mocks/[id]/attempts`
  - `app/api/app/viva-attempts`
- remaining inconsistency is mostly response-shape polish, not a security blocker

---

## Phase 2: Backend Architecture Cleanup

### 2.1 Thin route handlers

Goal:

- reduce large route handlers into smaller orchestration layers

Tasks:

- identify routes above practical complexity threshold
- move domain logic to services under `lib/server`

Candidates:

- `pricing-plans` routes
- `courses` routes
- `videos` routes
- `viva-cases` routes
- `daily-quiz` routes

Deliverable:

- route files mostly contain:
  - auth
  - validation
  - service call
  - response

### 2.2 Shared normalization helpers

Goal:

- stop scattering normalization logic across route files

Tasks:

- centralize helpers for:
  - user tier normalization
  - course access normalization
  - video/provider normalization
  - timestamp/date formatting
  - content-type label normalization

Candidates:

- `guestService.ts`
- `courses` routes
- `pricing` routes
- `videos` services

### 2.3 Validation cleanup

Goal:

- reject malformed payloads consistently

Tasks:

- add reusable request validation helpers
- validate:
  - strings
  - numbers
  - enum-like values
  - arrays of ids
- stop silently coercing too much where it hides bad input

Note:

- no route contract changes unless necessary

### 2.4 Logging cleanup

Goal:

- remove noisy or sensitive logs

Tasks:

- audit all `console.log` and `console.error` usage
- remove sensitive auth/header/token logging
- keep useful operational logs only
- standardize error messages

---

## Phase 3: Frontend Architecture Cleanup

### 3.1 Extract shared course components

Goal:

- reduce duplication between course list and course detail screens

Tasks:

- extract:
  - `AccessTierSwitch`
  - course badges
  - course card
  - member picker row
  - section card
  - section content selector

Current targets:

- `app/dashboard/curriculum/courses/page.tsx`
- `app/dashboard/curriculum/courses/[id]/page.tsx`

### 3.2 Extract shared user management components

Goal:

- keep users UI small and reusable

Tasks:

- extract:
  - `UserSearchBar`
  - `UserStatusBadge`
  - `AssignedCoursesCell`
  - `TierActionMenu`

Current targets:

- `app/dashboard/users/UserClient.tsx`
- `components/Users/UserTabs.tsx`
- `components/Users/UserTable.tsx`

### 3.3 Pricing page modularization

Goal:

- split the pricing page into clear parts

Tasks:

- extract:
  - `PricingHero`
  - `CouponBanner`
  - `TopStat`
  - `PricingCategorySection`
  - `PricingPlanCard`
  - `AccessLine`

Current target:

- `app/pricing/page.tsx`

### 3.4 Plan creator modularization

Goal:

- break one of the largest dashboard pages into manageable pieces

Tasks:

- split:
  - catalog fetching/orchestration
  - plan form
  - scope selectors
  - content selectors
  - summary card
  - saved plans panel
  - coupon launcher

Current target:

- `app/dashboard/system/plan-creator/page.tsx`

### 3.5 Video library modularization

Goal:

- continue cleanup of the videos admin area

Tasks:

- isolate:
  - section header actions
  - drive browser
  - import dialog
  - video grid card
  - player surface
  - filters/search

---

## Phase 4: Reusable UI System

### 4.1 Shared reusable components

Create or standardize:

- `SearchBar`
- `SectionHeader`
- `EmptyState`
- `MetricCard`
- `AccessBadge`
- `VisibilityBadge`
- `ConfirmDialog`
- `EntityCard`
- `SelectionPanel`
- `ListToolbar`

### 4.2 Badge language cleanup

Goal:

- stop having slightly different badge semantics everywhere

Standardize badges for:

- `free`
- `paid`
- `members-only`
- `visible on app`
- `hidden from app`
- `active`
- `inactive`

### 4.3 Confirmation pattern cleanup

Goal:

- destructive actions should feel consistent

Tasks:

- replace scattered `window.confirm` where appropriate with shared confirmation UI
- keep simple confirmation only where speed matters and UX cost is low

---

## Phase 5: Pagination and Data Loading

### 5.1 Quiz/question pagination

Goal:

- avoid loading large question sets all at once

Tasks:

- add pagination support to quiz question retrieval where large payloads exist
- allow fetching:
  - first `10`
  - next `10`
  - subsequent slices
- preserve existing small-quiz behavior where reasonable

Targets:

- app quiz detail routes
- admin quiz/question management routes where payloads are large

### 5.2 Users pagination

Goal:

- make admin user tables scalable

Tasks:

- add pagination or cursor support to users list retrieval
- support search + pagination together

### 5.3 Video library pagination

Goal:

- avoid huge video library payloads over time

Tasks:

- paginate library/video item listing when collection grows
- preserve grouped section rendering in UI

### 5.4 Daily quiz history pagination

Goal:

- archive/history should not load unbounded records

Tasks:

- paginate daily quiz history
- preserve date grouping

### 5.5 Generic pagination contract

Adopt a consistent response shape where possible:

- `items`
- `nextCursor`
- `hasMore`
- optional `total`

---

## Phase 6: Course and Entitlement Model

### 6.1 Course membership enforcement

Goal:

- use course membership as the real content gate for RN

Tasks:

- audit course membership behavior end to end
- verify `activeCourseIds` is the single source of truth for member-only courses
- ensure `/api/app/courses` returns only allowed courses

### 6.2 Attach content enforcement to course membership

Goal:

- not just show course shells, but actually gate content under those courses

Tasks:

- map course sections to content ids cleanly
- enforce access for:
  - videos
  - chapter quizzes
  - mocks
  - grand mocks
  - AI viva

Important:

- do this through existing app routes
- do not break route exposure

### 6.3 Plan-to-course entitlement bridge

Goal:

- future plan purchase should activate course access automatically

Tasks:

- define how purchased plans assign one or more courses
- prefer course-based entitlement over raw item-based unlocks
- keep old fields temporarily until migration is complete

---

## Phase 7: Security Hardening Follow-Ups

### 7.1 Rate limiting

Open question:

- not implemented yet

Potential targets:

- auth finalize routes
- guest creation routes
- uploads
- mutation-heavy admin routes

### 7.2 Ownership and permission review

Tasks:

- review file/video permission mutation routes
- review drive permission routes
- ensure only admins can invoke them

### 7.3 Destructive action review

Tasks:

- verify delete operations:
  - courses
  - users
  - videos
  - plans
  - sections
  - viva cases

Need:

- confirmation
- backend auth
- safe follow-up data cleanup if required

---

## Phase 8: Documentation and Developer Experience

### 8.1 Keep `implementation.md` current

Tasks:

- update when app route contracts change
- update when course membership becomes the real RN content gate

### 8.2 Maintain `todo.md`

Tasks:

- update after every meaningful cleanup slice
- mark:
  - done
  - deferred
  - blocked

### 8.3 Add module notes where helpful

Candidates:

- courses
- pricing plans
- video delivery
- app access model

---

## Immediate Next Slices

These are the safest next steps after this document:

1. Extract shared course UI/types into reusable course modules.
2. Add admin guards to course and pricing mutation routes.
3. Refactor plan creator into smaller components.
4. Add pagination design for quiz questions.
5. Audit app routes for course-membership enforcement.

---

## Open Questions

### Q1

Should `member-only` courses still require user tier `free`/`paid`, or should course membership alone be enough after authentication?

Current direction:

- authenticated user + course membership should likely be sufficient

Need confirmation before large entitlement refactor.

### Q2

Should paid users always be visible as a separate admin bucket, or should future user management pivot to:

- free users
- subscribed course members
- enterprise/mentor/custom access

Current implementation still keeps `free` and `paid` because that is the current product language.

### Q3

Should `/api/app/videos/library` eventually return:

- all visible videos with lock metadata
- or only videos inside accessible courses

Current direction:

- likely course-aware filtering plus lock metadata

### Q4

How much of the old item-based plan selection should remain once course-based access is fully adopted?

Current direction:

- keep temporarily for backward compatibility
- phase down later

---

## Tracking Format

When working this list, mark items using:

- `[ ]` not started
- `[-]` in progress
- `[x]` done

This file starts as planning-first and can be updated into a checked execution log over time.
