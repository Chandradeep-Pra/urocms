# Firestore Migration Guide

This project now includes a Firestore migration script for copying data from the old Firebase project into the current one, including nested subcollections.

Script:

- [scripts/migrate-firestore.js](C:\Users\HP\Downloads\urocms\scripts\migrate-firestore.js)

## What it does

- reads from the old Firestore project
- writes into the current Firestore project
- preserves document ids
- recursively copies nested subcollections
- can migrate all collections or only selected ones
- supports dry run and overwrite modes

## Credential source

The script uses:

- current active `FIREBASE_*` env vars as the target project
- old project credentials from either:
  - `OLD_FIREBASE_PROJECT_ID`
  - `OLD_FIREBASE_CLIENT_EMAIL`
  - `OLD_FIREBASE_PRIVATE_KEY`

If `OLD_FIREBASE_*` is not set, it falls back to the first commented `FIREBASE_*` admin block in `.env.local`.

That matches the current repo setup where the old Firebase project is commented out in:

- [C:\Users\HP\Downloads\urocms\.env.local](C:\Users\HP\Downloads\urocms\.env.local)

## Recommended process

### 1. Back up first

Before running a real copy:

- export the current target Firestore if possible
- or clone the target project into a temporary environment

### 2. Dry run first

Run:

```powershell
cmd /c npm.cmd run migrate:firestore -- --dry-run
```

This confirms:

- source project is detected correctly
- target project is detected correctly
- collections are discoverable
- source and target are not accidentally the same project

Expected behavior with your current repo setup:

- the script reads the old Firebase admin credentials from the commented `FIREBASE_*` block in `.env.local`
- the script reads the new Firebase admin credentials from the active `FIREBASE_*` values in `.env.local`
- you do not need to manually uncomment the old project values

### 3. See the script help

```powershell
cmd /c npm.cmd run migrate:firestore -- --help
```

### 4. Migrate selected collections first

Example:

```powershell
cmd /c npm.cmd run migrate:firestore -- --collections=users,courses,vivaCases,mocks
```

### 5. Migrate everything

```powershell
cmd /c npm.cmd run migrate:firestore
```

### 6. Overwrite existing target docs only if you really want to

```powershell
cmd /c npm.cmd run migrate:firestore -- --overwrite
```

Default behavior without `--overwrite`:

- copy missing docs
- skip docs that already exist in the new project
- still recurse through subcollections

## Useful flags

### Dry run

```powershell
cmd /c npm.cmd run migrate:firestore -- --dry-run
```

### Only selected collections

```powershell
cmd /c npm.cmd run migrate:firestore -- --collections=users,courses
```

### Overwrite mode

```powershell
cmd /c npm.cmd run migrate:firestore -- --overwrite
```

### Combine selected collections with overwrite

```powershell
cmd /c npm.cmd run migrate:firestore -- --collections=users,courses --overwrite
```

## Nested subcollections

Nested subcollections are copied automatically.

Example:

- `courses/{id}/...`
- `mockAttempts/{uid}/items/{attemptId}`
- `vivaAttempts/{uid}/items/{attemptId}`
- `bookmarks/{uid}/items/{bookmarkId}`

The script recursively traverses every document and copies all child subcollections under it.

## Important cautions

- Do a dry run first.
- Do not use `--overwrite` unless you are sure the target data should be replaced.
- If the old and new projects both contain live data, prefer collection-by-collection migration instead of full overwrite.
- Keep the old credentials temporary. Remove or re-comment them once migration is complete.
- If the script says source and target project ids are identical, stop and fix `.env.local` before retrying.

## Suggested first migration batch for this project

Start with:

```powershell
cmd /c npm.cmd run migrate:firestore -- --collections=users,courses,quizzes,questions,questionBanks,mocks,vivaCases,vivaFolders,videoSections,videoItems,pricingPlans,pricingCoupons
```

Then, if needed, migrate learner-history collections:

```powershell
cmd /c npm.cmd run migrate:firestore -- --collections=videoProgress,mockAttempts,vivaAttempts,bookmarks,userStats,notifications
```

## After migration

Verify in the new Firebase project:

- top-level collection counts
- a few random documents
- nested subcollections for candidate progress
- course-linked content ids
- viva case access data
- mock attempts and viva reports

## Suggested command order for your case

Because your old credentials are already commented in `.env.local`, the safest flow is:

```powershell
cmd /c npm.cmd run migrate:firestore -- --dry-run
cmd /c npm.cmd run migrate:firestore -- --collections=users,courses,quizzes,questions,questionBanks,mocks,vivaCases,vivaFolders,videoSections,videoItems
cmd /c npm.cmd run migrate:firestore -- --collections=videoProgress,mockAttempts,vivaAttempts,bookmarks,userStats,notifications
```

If you want a full copy after validating the dry run:

```powershell
cmd /c npm.cmd run migrate:firestore
```
