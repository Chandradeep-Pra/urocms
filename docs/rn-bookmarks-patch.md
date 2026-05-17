# RN Bookmarks Patch

## Objective

Add bookmarking support to the React Native app so candidates can save important learning items for later revision.

This patch covers the backend APIs now available and how the RN app should integrate them.

## Current Backend Status

Bookmarking is now implemented on the backend for authenticated app users.

Implemented:

- create bookmark
- de-duplicate bookmark by `type + targetId`
- delete bookmark
- fetch current user's bookmarks
- update `bookmarksCount` in user stats

## Supported Bookmark Types

The backend currently supports:

- `video`
- `quiz-question`
- `mock-question`
- `viva-case`

## Source Files

Backend helper:

- [C:\Users\HP\Downloads\urocms\lib\server\candidateProgress.ts](C:\Users\HP\Downloads\urocms\lib\server\candidateProgress.ts)

Routes:

- [C:\Users\HP\Downloads\urocms\app\api\app\bookmarks\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\bookmarks\route.ts)
- [C:\Users\HP\Downloads\urocms\app\api\app\bookmarks\[id]\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\bookmarks\[id]\route.ts)
- [C:\Users\HP\Downloads\urocms\app\api\app\me\bookmarks\route.ts](C:\Users\HP\Downloads\urocms\app\api\app\me\bookmarks\route.ts)

## Auth Requirement

All bookmark APIs require:

```http
Authorization: Bearer <firebase_id_token>
```

User identity is derived from the token.

The RN app must not send or trust a client-supplied `uid`.

## Data Shape

Each bookmark record looks like:

```ts
{
  id: string;
  type: "video" | "quiz-question" | "mock-question" | "viva-case";
  targetId: string;
  parentId?: string | null;
  title?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}
```

### Field Meaning

- `type`
  - item category
- `targetId`
  - the item being saved
- `parentId`
  - optional parent container id
  - examples:
    - quiz id for a quiz question
    - mock id for a mock question
    - section id for a video if useful
- `title`
  - optional display title snapshot
- `notes`
  - optional learner note for later revision

## API Contract

### 1. Create Bookmark

Endpoint:

- `POST /api/app/bookmarks`

Purpose:

- create a new bookmark
- or update the existing one if the same `type + targetId` already exists

### Request Body

```json
{
  "type": "video",
  "targetId": "video_123",
  "parentId": "section_1",
  "title": "Renal trauma introduction",
  "notes": "Revise before weekend mock"
}
```

### Validation Rules

- `type` must be one of the supported bookmark types
- `targetId` is required
- duplicate create on same `type + targetId` does not create another row
- instead, existing bookmark is updated

### Success Response

```json
{
  "success": true,
  "bookmark": {
    "id": "bookmark_1",
    "type": "video",
    "targetId": "video_123",
    "parentId": "section_1",
    "title": "Renal trauma introduction",
    "notes": "Revise before weekend mock",
    "createdAt": "2026-05-17T...",
    "updatedAt": "2026-05-17T..."
  },
  "created": true
}
```

If the bookmark already existed:

```json
{
  "success": true,
  "bookmark": {
    "id": "bookmark_1",
    "type": "video",
    "targetId": "video_123",
    "parentId": "section_1",
    "title": "Renal trauma introduction",
    "notes": "Updated note",
    "updatedAt": "2026-05-17T..."
  },
  "created": false
}
```

## 2. Delete Bookmark

Endpoint:

- `DELETE /api/app/bookmarks/:id`

Purpose:

- remove a saved bookmark from the current user's bookmark collection

### Success Response

```json
{
  "success": true,
  "id": "bookmark_1"
}
```

### Not Found Response

```json
{
  "error": "Bookmark not found"
}
```

Status:

- `404`

## 3. Fetch My Bookmarks

Endpoint:

- `GET /api/app/me/bookmarks`

Purpose:

- show saved revision items
- build saved-items screen
- support bookmark state hydration in the app

### Response Shape

```json
{
  "count": 2,
  "items": [
    {
      "id": "bookmark_1",
      "type": "video",
      "targetId": "video_123",
      "parentId": "section_1",
      "title": "Renal trauma introduction",
      "notes": "Revise before weekend mock",
      "createdAt": "2026-05-17T...",
      "updatedAt": "2026-05-17T..."
    },
    {
      "id": "bookmark_2",
      "type": "viva-case",
      "targetId": "case_88",
      "title": "Obstructed infected kidney",
      "notes": null,
      "createdAt": "2026-05-17T...",
      "updatedAt": "2026-05-17T..."
    }
  ]
}
```

Bookmarks are returned ordered by:

- `createdAt desc`

## User Stats Effect

Creating a new bookmark:

- increments `bookmarksCount`

Deleting a bookmark:

- decrements `bookmarksCount`

This means the bookmarks counter on dashboard summaries can now reflect real saved-item usage.

## RN Integration Strategy

The RN app should support three bookmark experiences:

1. toggle bookmark on content cards or detail screens
2. dedicated bookmarks screen
3. hydrated saved state when opening app screens

## Recommended RN Service Layer

Add these functions:

- `createBookmark(payload)`
- `deleteBookmark(id)`
- `getMyBookmarks()`

### Example Service Calls

```ts
export async function createBookmark(payload: {
  type: "video" | "quiz-question" | "mock-question" | "viva-case";
  targetId: string;
  parentId?: string | null;
  title?: string | null;
  notes?: string | null;
}) {
  return apiFetch("/api/app/bookmarks", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteBookmark(id: string) {
  return apiFetch(`/api/app/bookmarks/${id}`, {
    method: "DELETE",
  });
}

export async function getMyBookmarks() {
  return apiFetch("/api/app/me/bookmarks");
}
```

## Suggested RN Types

```ts
export type BookmarkType =
  | "video"
  | "quiz-question"
  | "mock-question"
  | "viva-case";

export type BookmarkItem = {
  id: string;
  type: BookmarkType;
  targetId: string;
  parentId?: string | null;
  title?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
};
```

## Bookmark Toggle Behavior

### Recommended UI Flow

When the user taps bookmark:

1. check whether the item is already bookmarked
2. if not bookmarked:
   - call `POST /api/app/bookmarks`
3. if already bookmarked:
   - call `DELETE /api/app/bookmarks/:id`

### Important Note

The delete route requires bookmark document id, not `targetId`.

So the RN app should keep a local mapping like:

```ts
Map<string, BookmarkItem>
```

Suggested key format:

- `${type}:${targetId}`

Example:

- `video:video_123`
- `viva-case:case_88`

This makes it easy to know:

- whether something is already bookmarked
- which bookmark document id to delete

## Recommended Local State Shape

```ts
type BookmarkIndex = Record<string, BookmarkItem>;
```

Populate it from `GET /api/app/me/bookmarks`.

Helper example:

```ts
export function toBookmarkKey(type: BookmarkType, targetId: string) {
  return `${type}:${targetId}`;
}
```

## Suggested RN Screen Usage

### Video Screen

Use:

- `type: "video"`
- `targetId: video.id`
- optional `parentId: sectionId`

### Quiz Question Screen

Use:

- `type: "quiz-question"`
- `targetId: question.id`
- `parentId: quiz.id`

### Mock Question Screen

Use:

- `type: "mock-question"`
- `targetId: question.id`
- `parentId: mock.id`

### Viva Case Screen

Use:

- `type: "viva-case"`
- `targetId: case.id`

## Recommended UX Rules

### Bookmark Icon State

Filled state:

- already bookmarked

Outline state:

- not bookmarked

### Dedicated Bookmarks Screen

Suggested sections:

- videos
- quiz questions
- mock questions
- viva cases

Or simply group by `type`.

### Optional Notes

If the RN app wants a richer revision flow, it can allow note editing during bookmark creation.

If not needed initially:

- pass `notes: null`

## Error Handling

### `401 Unauthorized`

Means:

- no token
- invalid token
- expired session

RN action:

- refresh token or send user through login

### `400 Bad Request`

Means:

- invalid bookmark type
- missing `targetId`

RN action:

- show a generic save failure toast

### `404 Not Found`

On delete:

- bookmark record not found

RN action:

- remove stale local bookmark state and refetch if needed

## Recommended RN Implementation Order

1. add `getMyBookmarks()` at app startup or on bookmarks screen load
2. build local bookmark index
3. add bookmark toggle on videos
4. add bookmark toggle on viva cases
5. add quiz and mock question bookmarks after question-level UI is ready
6. add dedicated bookmarks screen

## Known Limitations

Current bookmark API scope:

- no server-side filtering by type yet
- no pagination yet
- no dedicated note edit endpoint beyond create/upsert behavior
- no bookmark-driven recommendation logic yet

These are fine for phase 1.

## Expected Product Outcome

After this patch, the RN app should be able to:

- let candidates save important learning items
- restore bookmark state reliably
- build a saved-items revision view
- contribute to candidate progress visibility through `bookmarksCount`

This is the current bookmark contract for RN integration.
