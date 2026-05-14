# Reiterate Plan

## Goal

Refactor this codebase gradually so it feels like it was built and maintained by a strong senior engineering team:

- cleaner architecture
- smaller files
- reusable UI primitives
- secure backend behavior
- predictable API contracts
- incremental, low-risk change management

This is **not** a rewrite plan.
This is a disciplined **re-iteration** plan for improving the current product without breaking the existing app, admin, or route contracts.

## Core Rule

Do not make large, sweeping rewrites.

Prefer:

1. stabilize existing behavior
2. extract repeated logic
3. split oversized files
4. improve security and API hygiene
5. add pagination and performance improvements
6. document unclear areas before changing them

---

## Frontend Direction

### Main objective

Re-iterate the frontend into a clean, modular, reusable system with consistent design and smaller files.

### Standards

- break large pages into micro components
- separate page orchestration from presentational UI
- move repeated UI into reusable shared components
- keep consistent spacing, typography, colors, and interaction patterns
- prefer composition over long single-file JSX

### Preferred frontend structure

Each larger screen should move toward:

- `page.tsx`
  - data fetch / route-level orchestration only
- feature container component
  - state coordination
  - mutations
  - server interaction
- small presentational components
  - cards
  - sections
  - lists
  - rows
  - dialogs
  - form pieces

### Reusable components to standardize

Create or consolidate reusable components for:

- `SearchBar`
- `SectionHeader`
- `EmptyState`
- `StatusBadge`
- `ConfirmAction`
- `PageShell`
- `FilterBar`
- `InlineMetric`
- `AccessBadge`
- `ListCard`
- `SelectionList`

Use existing UI primitives where appropriate:

- `Button`
- `Input`
- `Textarea`
- `Select`
- `Switch`
- `Badge`
- `Dialog`
- `Card`

### File-size discipline

Targets:

- page files should ideally stay below `150-250` lines
- components above `200-250` lines should be reviewed for extraction
- business logic should not live inline inside large JSX blocks when it can be moved to helpers or feature hooks

### Frontend consistency rules

- same button hierarchy across admin screens
- same badge semantics across app
  - free
  - members-only
  - paid
  - visible
  - hidden
- same confirmation pattern before destructive actions
- same list and detail rhythm across content modules
- same search and filtering experience where applicable

---

## Backend Direction

### Main objective

Keep the existing route surface intact, but make implementation safer, cleaner, and easier to maintain.

### Route contract rule

Do **not** change:

- route paths
- route exposure shape
- route names

Unless explicitly planned and versioned.

This means:

- keep existing `/api/*` and `/api/app/*` endpoints stable
- improve implementation behind them
- add guards, services, validation, and pagination without changing consumer expectations unless necessary

### Preferred backend architecture

Move toward:

- thin route handlers
- shared service layer
- shared auth guards
- shared validation helpers
- shared response helpers

Ideal route shape:

1. authenticate / authorize
2. validate request
3. call service
4. normalize response
5. log safely

### Service extraction rule

If logic is reused or route handler becomes large, move it into:

- `lib/server/...`
- dedicated service files per domain

Examples:

- course access service
- pricing entitlement service
- quiz pagination service
- video playback resolver
- admin authorization guard

---

## Security Direction

### Main objective

Treat public hosting as normal, and enforce security in code.

### Security rules

All admin/CMS routes should be reviewed and protected appropriately.

#### Admin routes

Routes used by dashboard/admin must enforce:

- authenticated admin check
- not just frontend guard
- server-side authorization

#### App routes

Routes used by RN/web learners must enforce:

- Firebase token verification
- user session resolution
- course/tier entitlement checks

### Security improvements required

- centralize admin-only guard
- centralize app-user guard
- validate request body shape
- validate query params
- avoid trusting client-supplied identity
- derive user identity from verified token
- remove sensitive logging
- review mutation routes for missing authorization

### Sensitive operations

Require explicit confirmation or extra care for:

- delete actions
- member assignment changes
- access-tier changes
- payment / entitlement changes
- file permission / sharing actions

---

## Incremental Change Strategy

### Rule

Every change should be incremental, reviewable, and low-risk.

### Process

For each domain:

1. map current behavior
2. preserve route contract
3. extract logic
4. add missing validation/security
5. split UI into smaller components
6. verify behavior after each step

### If unsure

Create or append to:

- `todo.md`

Use `todo.md` for:

- uncertain architectural choices
- places needing migration strategy
- risky changes deferred intentionally
- inconsistent data shape that needs follow-up

Do not guess silently when the guess can create product or data risk.

---

## Pagination Direction

### Main objective

Add pagination where large payloads are wasteful or dangerous, without breaking flows that benefit from full small payloads.

### General rule

Paginate GET routes when:

- collections can grow materially
- list render cost is non-trivial
- payload size can become large
- app/web does not need everything at once

### Good pagination candidates

- questions inside quizzes
- question banks
- users
- videos
- viva cases
- daily quiz history
- announcements
- mocks list
- courses list if large

### Example explicitly called out

For quiz question loading:

- do not return all questions at once by default when the quiz is large
- allow loading first `10`
- then next `10`
- keep response shape predictable

### Pagination contract direction

Prefer consistent query params such as:

- `limit`
- `cursor`
- `page`
- `pageSize`

Prefer cursor-based pagination for mutable datasets.

### Important note

Do not force pagination where it hurts UX more than it helps.

Examples that may not need it immediately:

- small settings payloads
- tiny lookup lists
- very small catalogs used for admin select inputs

---

## Code Quality Rules

### Backend

- route handlers should stay small
- use shared helpers for normalization
- normalize data shape at boundaries
- avoid duplicate authorization logic
- avoid direct Firestore shape assumptions scattered across many files

### Frontend

- avoid giant stateful pages
- extract repeated render blocks
- avoid repeated inline badge/button logic
- keep props intentional and minimal
- prefer reusable list item components

### Shared

- use clear naming
- avoid magic strings repeated everywhere
- centralize enum-like values
  - course access tier
  - user tier
  - content type
  - module names

---

## Design System Direction

### Objective

Make admin experience feel like one product, not many unrelated screens.

### Design consistency rules

- one spacing rhythm
- one card language
- one empty-state language
- one confirmation language
- one badge language
- one search/filter pattern
- one table/list pattern

### UI cleanup priorities

- course builder
- pricing pages
- users tables
- videos library
- quizzes manager
- viva explorer

---

## Documentation Rules

### Add docs when:

- behavior is non-obvious
- route contract is important
- RN integration depends on exact shape
- membership/entitlement logic changes

### Keep docs updated for:

- `implementation.md`
- `reiterate.md`
- `todo.md`

---

## Suggested Work Order

### Phase 1

- secure admin routes
- standardize auth/authorization helpers
- add `todo.md`
- identify oversized files

### Phase 2

- split biggest frontend files into feature containers + micro components
- standardize reusable UI blocks
- normalize badges, search bars, dialogs, confirmation flows

### Phase 3

- add pagination to high-volume GET routes
- add response metadata where needed
  - total
  - next cursor
  - hasMore

### Phase 4

- strengthen entitlement model
- unify course access and plan access
- ensure RN app receives only the right content through stable app routes

### Phase 5

- performance review
- remove dead paths
- remove obsolete scripts/utilities
- simplify data flow further

---

## Definition Of Done For Any Refactor

A re-iteration is only considered complete when:

- route contract is preserved
- UI behavior still works
- security is same or better
- file complexity is reduced
- duplication is reduced
- future work is easier than before
- unresolved uncertainty is documented in `todo.md`

---

## Final Principle

The goal is not to make the codebase “different.”
The goal is to make it:

- safer
- smaller
- clearer
- more reusable
- more scalable
- more maintainable

The outcome should feel like a senior engineer progressively shaped the existing product into a durable platform, without destabilizing the business or breaking the apps.
