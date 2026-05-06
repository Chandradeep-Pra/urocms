# RN Video Integration Guide

This document describes how the React Native app should fetch and play videos from UroCMS.

## Overview

The RN app should use the student-facing app APIs only:

- `GET /api/app/videos/library`
- `GET /api/app/videos/[id]/play`

Important behavior:

- Paid/free filtering is handled by the backend using the authenticated user tier.
- Google Drive videos are only returned in the library if they have already been synced to Google Cloud Storage.
- The RN app should render sections and the videos inside each section from the `sections` array in the library response.

## Auth

All app video endpoints require the same authenticated app session used elsewhere in the RN app.

Send the user auth/session token the same way your current app APIs do.

## 1. Fetch Video Library

### Endpoint

`GET /api/app/videos/library`

Optional filter:

`GET /api/app/videos/library?sectionId=<sectionId>`

### Response shape

```json
{
  "tier": "free",
  "sectionCount": 2,
  "videoCount": 6,
  "sections": [
    {
      "id": "section_1",
      "title": "Stone Disease",
      "accessTier": "free",
      "effectiveAccessTier": "free",
      "videoCount": 3,
      "videos": [
        {
          "id": "video_1",
          "title": "PCNL Basics",
          "description": "Imported from Google Drive into Stone Disease",
          "videoUrl": "https://drive.google.com/...",
          "provider": "drive",
          "sectionId": "section_1",
          "accessTier": "free",
          "effectiveAccessTier": "free",
          "thumbnailUrl": "https://res.cloudinary.com/...",
          "storagePath": "videos/stone-disease/video_1/...",
          "storageBucket": "urology-premium",
          "mimeType": "video/mp4",
          "requiresGoogleSession": false,
          "isSyncedToCloudStorage": true
        }
      ]
    }
  ],
  "videos": []
}
```

### Notes

- `sections` is the primary structure the RN app should use.
- `videos` is still returned as a flat list for convenience/debugging.
- If a video originally came from Google Drive but is not synced to Cloud Storage, it will not appear in this app library response.
- This means the RN app does not need to manually filter unsynced Drive videos.

## 2. What To Show In RN

Render:

1. Section list from `sections`
2. Video cards from `section.videos`

Recommended card fields:

- `title`
- `description`
- `thumbnailUrl`
- `effectiveAccessTier`
- optional provider badge if needed

Recommended lock rule:

- if `effectiveAccessTier === "paid"` and the user is not paid, show locked state
- in practice the backend already filters these out for free users, so this is mostly a defensive UI state

## 3. Play A Video

### Endpoint

`GET /api/app/videos/:id/play`

Example:

`GET /api/app/videos/abc123/play`

### Response shape

```json
{
  "video": {
    "id": "abc123",
    "title": "PCNL Basics",
    "description": "Imported from Google Drive into Stone Disease",
    "accessTier": "paid",
    "effectiveAccessTier": "paid",
    "sectionAccessTier": "paid",
    "provider": "storage",
    "sectionId": "section_1",
    "thumbnailUrl": "https://res.cloudinary.com/...",
    "storagePath": "videos/stone-disease/abc123/...",
    "storageBucket": "urology-premium",
    "mimeType": "video/mp4",
    "requiresGoogleSession": false
  },
  "playback": {
    "provider": "storage",
    "url": "https://storage.googleapis.com/...",
    "mimeType": "video/mp4",
    "storagePath": "videos/stone-disease/abc123/...",
    "storageBucket": "urology-premium"
  },
  "user": {
    "uid": "user_uid",
    "tier": "paid",
    "email": "user@example.com",
    "accountEmail": "user@example.com"
  }
}
```

### RN playback rule

Use `playback.url` directly in your RN video player if:

- `playback.provider === "storage"`

This is the main production path for premium content.

## 4. Recommended RN Fetch Flow

### Load library

```ts
const res = await fetch(`${API_BASE}/api/app/videos/library`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const data = await res.json();
const sections = data.sections ?? [];
```

### Play one video

```ts
const res = await fetch(`${API_BASE}/api/app/videos/${videoId}/play`, {
  headers: {
    Authorization: `Bearer ${token}`,
  },
});

const data = await res.json();

if (data.playback?.provider === "storage") {
  const videoUrl = data.playback.url;
}
```

## 5. Free / Paid Handling

The backend already applies access filtering.

Still use these fields in the RN UI:

- `accessTier`
- `effectiveAccessTier`

Meaning:

- `accessTier`: video-level access tier
- `effectiveAccessTier`: final access after considering section tier too

The RN app should trust `effectiveAccessTier` when deciding how to label the video.

## 6. Important Product Rules

- Only synced Google Drive videos should appear in the RN app
- All premium playback should happen from Google Cloud Storage signed URLs
- Do not use raw Drive preview URLs in RN for premium content
- Do not hardcode paid/free on the client; always trust backend response

## 7. Error Cases To Handle

### Library fetch failure

Show:

- retry state
- empty state

### Play failure

Handle:

- `403`: paid access required
- `404`: video not found
- `500`: playback preparation failed

## 8. Current Backend Behavior Summary

- Firestore stores metadata
- Google Cloud Storage stores synced premium video files
- Signed GCS URLs are returned by `/play`
- Unsynced Drive videos are excluded from the app library

## 9. Recommendation For RN Team

Use the `sections` array from `/api/app/videos/library` as the single source of truth for the browse screen.

Do not build a second grouping layer on the client unless needed for UI sorting.
