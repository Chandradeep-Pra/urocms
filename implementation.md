# RN App Integration Implementation

## Goal

Support this user journey consistently across backend and React Native:

1. `guest`
2. `free`
3. `paid`

Rules:

- `guest`: profile not completed yet, chapter quiz access locked
- `free`: chapter quiz preview limited to `4` questions, plus hosted mock and grand-mock preview limited to `3` questions per week total
- `paid`: full access to chapter quizzes, mocks, grand mocks, AI viva, and paid videos

## Existing Identity Routes

These routes remain part of the flow:

- `POST /api/validate-user`
- `POST /api/guest`
- `POST /api/upgrade-user`
- `POST /api/auth/google/complete`

## RN Auth Implementation

Use Firebase Auth in the RN app for:

- email sign up
- email sign in
- Google sign in
- anonymous guest entry if needed

After every successful auth event, the app should immediately call:

- `POST /api/validate-user`

That route is the source of truth for:

- `tier`
- `googleAccessEmail`
- app module access
- preview and gating policy

### Auth Decision Rule

After sign-in or sign-up:

1. get Firebase ID token
2. call `POST /api/validate-user`
3. read returned `tier`
4. route user into the app based on `tier`

You do not need a separate backend login API for RN.
Firebase Auth handles login identity.
Your backend handles user tier and access policy.

### 1. Email Sign Up

RN should:

- create user with Firebase email/password auth
- get Firebase ID token
- call `POST /api/validate-user`

Expected result:

- new email/password users become `free`
- app should enter normal free flow immediately

Example:

```ts
import auth from "@react-native-firebase/auth";

export async function signUpWithEmail(email: string, password: string) {
  const credential = await auth().createUserWithEmailAndPassword(email, password);
  const token = await credential.user.getIdToken();
  const profile = await validateUserWithToken(token);

  return {
    firebaseUser: credential.user,
    profile,
  };
}
```

### 2. Email Sign In

RN should:

- sign in with Firebase email/password auth
- get Firebase ID token
- call `POST /api/validate-user`

Expected result:

- backend returns the current tier for that user
- app routes user accordingly

Example:

```ts
import auth from "@react-native-firebase/auth";

export async function signInWithEmail(email: string, password: string) {
  const credential = await auth().signInWithEmailAndPassword(email, password);
  const token = await credential.user.getIdToken();
  const profile = await validateUserWithToken(token);

  return {
    firebaseUser: credential.user,
    profile,
  };
}
```

### 3. Google Sign In

RN should:

- perform Google sign-in in the app
- exchange Google credential into Firebase Auth
- get Firebase ID token
- call `POST /api/auth/google/complete`
- then call `POST /api/validate-user`

Why both calls:

- `google/complete` finalizes the backend user record for the signed-in Google email
- `validate-user` gives the app the latest tier and access policy

Expected result:

- if the Google email already has an existing user record, backend preserves the best existing tier
- if it is a new Google user, backend treats it as a normal signed-in app user
- app then routes using returned `tier`

Example:

```ts
import auth from "@react-native-firebase/auth";
import { GoogleSignin } from "@react-native-google-signin/google-signin";

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const googleUser = await GoogleSignin.signIn();
  const idToken = googleUser.data?.idToken || googleUser.idToken;

  if (!idToken) {
    throw new Error("Google idToken missing");
  }

  const googleCredential = auth.GoogleAuthProvider.credential(idToken);
  const credential = await auth().signInWithCredential(googleCredential);
  const firebaseToken = await credential.user.getIdToken();

  await finalizeGoogleSignIn(firebaseToken);
  const profile = await validateUserWithToken(firebaseToken);

  return {
    firebaseUser: credential.user,
    profile,
  };
}
```

### 4. Existing Account Linking Case

If Firebase returns an account-linking case for Google sign-in:

- sign the user into the existing Firebase account first
- then link Google credential on the client
- then call `POST /api/auth/google/complete`
- then call `POST /api/validate-user`

Backend note:

- `/api/auth/google/complete` helps merge the Firestore-side user records by email
- Firebase Auth provider linking itself still happens on the RN client

### 5. Guest Entry

If you still support anonymous guest entry:

- sign in anonymously with Firebase Auth
- collect email/profile later
- call `POST /api/validate-user`

Expected result:

- anonymous users are `guest`

Example:

```ts
import auth from "@react-native-firebase/auth";

export async function continueAsGuest() {
  const credential = await auth().signInAnonymously();
  const token = await credential.user.getIdToken();
  const profile = await validateUserWithToken(token);

  return {
    firebaseUser: credential.user,
    profile,
  };
}
```

### 6. App Routing After Auth

Use the returned `tier` directly:

- `guest`
  - send user into guest shell
  - show complete-profile prompts
- `free`
  - send user into the main app
  - enable free-tier gated content
- `paid`
  - send user into the main app
  - enable all gated paid modules

Example:

```ts
export function resolvePostAuthRoute(tier: "guest" | "free" | "paid") {
  if (tier === "guest") return "GuestHome";
  return "MainApp";
}
```

### `POST /api/validate-user`

Send Firebase ID token as:

```http
Authorization: Bearer <firebase_id_token>
```

Response now includes:

- `tier`
- `email`
- `googleAccessEmail`
- `policy.freeChapterPreviewLimit`
- `policy.freeWeeklyMockPreviewLimit`
- `policy.modules`

Use this route immediately after app launch / login to determine the user tier.

### `POST /api/auth/google/complete`

Use this after the RN app has already completed Firebase Google sign-in or Firebase account linking on the client.

Send Firebase ID token as:

```http
Authorization: Bearer <firebase_id_token>
```

What it does:

- normalizes the signed-in Google email
- sets `googleAccessEmail`
- preserves the highest existing tier for that email
- merges duplicate Firestore `users` docs for the same email into the current Firebase `uid`

Important:

- this route does not replace Firebase client-side Google sign-in
- actual provider linking still happens in the RN app with Firebase Auth
- this route is the backend finalize step after client auth succeeds

## New Protected App Routes

These are the routes the React Native app should use for gated content:

- `GET /api/app/access`
- `GET /api/app/quizzes`
- `GET /api/app/quizzes/:id`
- `GET /api/app/mocks`
- `GET /api/app/mocks/:id`
- `POST /api/app/mocks/:id/attempts`
- `GET /api/app/viva-cases`
- `POST /api/app/viva-attempts`
- `GET /api/app/videos/library`
- `GET /api/app/videos/:id/play`
- `GET /api/app/videos/:id/stream`

All of them require:

```http
Authorization: Bearer <firebase_id_token>
```

## Recommended RN Flow

### 1. App startup

Call:

- `POST /api/validate-user`

Store:

- `tier`
- `policy.freeChapterPreviewLimit`
- `policy.freeWeeklyMockPreviewLimit`
- `policy.modules`

### 2. Guest flow

If `tier === "guest"`:

- show locked chapter quiz CTA
- prompt the user to complete profile
- after profile completion, call your profile completion flow so the user becomes `free`

### 3. Free flow

If `tier === "free"`:

- fetch quiz list from `GET /api/app/quizzes`
- show chapter quizzes as preview-enabled
- show hosted mocks / grand mocks as weekly preview-enabled
- show AI viva as locked
- when opening a chapter quiz, use `GET /api/app/quizzes/:id`
- read `access.mode === "preview"`
- use `access.returnedQuestionCount` and `access.totalQuestionCount` to show preview messaging
- when opening a hosted mock, use `GET /api/app/mocks/:id`
- use `access.weeklyRemainingQuestions` to show remaining weekly allowance

### 4. Paid flow

If `tier === "paid"`:

- fetch chapter quizzes from `GET /api/app/quizzes`
- fetch mocks from `GET /api/app/mocks`
- fetch viva cases from `GET /api/app/viva-cases`
- fetch videos from `GET /api/app/videos/library`
- when the user taps a video, call `GET /api/app/videos/:id/play`

## Response Behavior

### `GET /api/app/access`

Returns:

- current `tier`
- profile info
- policy modules
- free preview limit
- free weekly mock preview limit

Use this as a convenience route if you want one app-wide access payload after login.

### `GET /api/app/quizzes`

Each quiz includes:

- `type`
- `access.allowed`
- `access.mode`
- `access.previewLimit`
- `access.requiredTier`
- `access.reason`

RN should use this to render locked vs available cards.

### `GET /api/app/quizzes/:id`

For `free` users on chapter quizzes:

- only the first `4` questions are returned
- response includes:
  - `access.mode`
  - `access.previewLimit`
  - `access.totalQuestionCount`
  - `access.returnedQuestionCount`

For locked content:

- route returns `403`
- body includes `access.requiredTier`

### `GET /api/app/mocks`

- `guest` returns `403`
- `free` gets hosted mock cards with weekly preview metadata
- `paid` gets full access

### `GET /api/app/mocks/:id`

- `guest` returns `403`
- `free` can preview up to `3` hosted mock questions per week total across mocks and grand mocks
- reopening the same mock in the same week does not consume the budget again
- `paid` gets full mock detail and questions

### `POST /api/app/mocks/:id/attempts`

Expected body:

```json
{
  "marks": 72
}
```

Only `paid` users can submit hosted mock attempts.
User identity is derived from the verified token, not from body fields.

### `GET /api/app/viva-cases`

- `paid` only

### `POST /api/app/viva-attempts`

Expected body:

```json
{
  "caseId": "case_doc_id",
  "report": {}
}
```

Candidate identity is derived from the verified token.

### `GET /api/app/videos/library`

- `paid` gets all videos
- `guest` and `free` only get videos where `accessTier !== "paid"`

Use this route as the source for:

- video sections
- videos inside each section
- section-level rendering in RN

Current route behavior:

- returns a flat `videos` array
- each video includes `sectionId`
- each video includes `sectionTitleSnapshot`
- each video includes `provider`
- each video may include `storagePath`, `storageBucket`, and `mimeType`

RN should group the flat array like:

```ts
type VideoSectionGroup = {
  sectionId: string;
  sectionTitle: string;
  videos: VideoLibraryItem[];
};

function groupVideosBySection(videos: VideoLibraryItem[]): VideoSectionGroup[] {
  const map = new Map<string, VideoSectionGroup>();

  for (const video of videos) {
    const sectionId = video.sectionId || "unassigned";
    const sectionTitle = video.sectionTitleSnapshot || "Unassigned";

    if (!map.has(sectionId)) {
      map.set(sectionId, {
        sectionId,
        sectionTitle,
        videos: [],
      });
    }

    map.get(sectionId)!.videos.push(video);
  }

  return Array.from(map.values());
}
```

### `GET /api/app/videos/:id/play`

Use this when the user taps a video card.

This route returns:

- `video`
- `playback`
- `user`

Playback response depends on provider:

1. Firebase Storage-backed video

- `playback.provider = "storage"`
- `playback.url`
- `playback.mimeType`
- `playback.storagePath`

Use `playback.url` in the RN player or WebView/video component.

2. Google Drive-backed video that is not yet synced to Firebase Storage

- `playback.provider = "drive"`
- `playback.driveFileId`
- `playback.streamUrl`
- `playback.previewUrl`
- `playback.webViewUrl`
- `playback.accountEmail`

Use:

- `playback.streamUrl` for in-app playback when backend streaming is working
- `playback.webViewUrl` or `playback.previewUrl` as fallback if you want to open the video through Google Drive outside the app flow

Important:

- yes, a Drive video can still be opened normally in Google Drive outside the app using `webViewUrl`
- but the best in-app experience is still the Firebase Storage path after admin sync

### `GET /api/app/videos/:id/stream`

This is the backend stream route for app playback.

Use this only when:

- `playback.provider === "drive"`
- and you intentionally want the app to stream through the backend route

If the video has already been synced to Firebase Storage, the preferred player input is:

- `playback.url` from `GET /api/app/videos/:id/play`

## Video Integration Contract

### Step 1. Load library

Call:

- `GET /api/app/videos/library`

Use it to:

- build section groups
- render thumbnails
- show free/paid visibility already filtered by backend

### Step 2. Open a video

Call:

- `GET /api/app/videos/:id/play`

Then branch by provider:

- `storage`
  - play `playback.url` directly in your app player
- `drive`
  - try `playback.streamUrl` for in-app playback if that video is still Drive-backed
  - or open `playback.webViewUrl` externally if you want Google Drive fallback behavior

### Step 3. Prefer synced videos

If a video has already been synced by admin to Firebase Storage:

- library item will include `storagePath`
- play route will return `playback.provider = "storage"`
- app should prefer that every time

This is the cleanest player path for:

- RN
- web
- custom controls
- no Google Drive UI dependency

## RN Video Playback Implementation

The RN app should **not** guess playback from `videoUrl` alone.
Always call:

- `GET /api/app/videos/:id/play`

Then branch using:

- `playback.provider`

### Playback Rule

Use this exact decision tree:

1. if `playback.provider === "storage"`
   - play with native video player
   - use `playback.url`
2. if `playback.provider === "youtube"`
   - open a YouTube player or WebView flow
   - do not pass YouTube page URLs into a native mp4 player
3. if `playback.provider === "drive"`
   - do **not** pass `previewUrl` or `webViewUrl` into `react-native-video`
   - use a `WebView` for Drive preview
   - or use external browser open as fallback

### Why RN Fails When Dashboard Works

Dashboard and RN do not play Drive videos the same way:

- dashboard can show a Google Drive iframe preview for Drive videos
- RN native video players expect a raw media stream URL
- Drive preview pages are not raw video files

So:

- `storage` videos usually play well in RN native player
- `drive` videos usually need `WebView` or external open

### Recommended RN Libraries

Use:

- `react-native-video` for Firebase Storage-backed playback
- `react-native-webview` for Google Drive preview fallback

### Example Video Screen Logic

```ts
type VideoPlaybackMode =
  | { kind: "storage"; url: string; mimeType: string }
  | { kind: "youtube"; url: string }
  | { kind: "drive"; previewUrl: string; webViewUrl: string; streamUrl: string };

export function resolvePlaybackMode(playResponse: VideoPlayResponse): VideoPlaybackMode {
  if (playResponse.playback.provider === "storage") {
    return {
      kind: "storage",
      url: playResponse.playback.url,
      mimeType: playResponse.playback.mimeType,
    };
  }

  if (playResponse.playback.provider === "youtube") {
    return {
      kind: "youtube",
      url: playResponse.playback.url,
    };
  }

  return {
    kind: "drive",
    previewUrl: playResponse.playback.previewUrl,
    webViewUrl: playResponse.playback.webViewUrl,
    streamUrl: playResponse.playback.streamUrl,
  };
}
```

### Example RN Player Component

```tsx
import React from "react";
import { Linking, View } from "react-native";
import Video from "react-native-video";
import { WebView } from "react-native-webview";

type Props = {
  playResponse: VideoPlayResponse;
};

export function AppVideoPlayer({ playResponse }: Props) {
  const playback = resolvePlaybackMode(playResponse);

  if (playback.kind === "storage") {
    return (
      <Video
        source={{ uri: playback.url }}
        controls
        resizeMode="contain"
        style={{ width: "100%", aspectRatio: 16 / 9, backgroundColor: "#000" }}
      />
    );
  }

  if (playback.kind === "youtube") {
    return (
      <WebView
        source={{ uri: playback.url }}
        style={{ width: "100%", aspectRatio: 16 / 9 }}
        javaScriptEnabled
        allowsFullscreenVideo
      />
    );
  }

  return (
    <WebView
      source={{ uri: playback.previewUrl }}
      style={{ width: "100%", aspectRatio: 16 / 9 }}
      javaScriptEnabled
      allowsFullscreenVideo
      onError={() => {
        Linking.openURL(playback.webViewUrl).catch(() => {});
      }}
    />
  );
}
```

### Important RN Note For Drive Videos

For `drive` videos:

- `previewUrl` is for Drive preview / embed style rendering
- `webViewUrl` is for opening the file normally in Google Drive
- `streamUrl` should only be used if backend Drive streaming is confirmed to work for that file

Do not assume:

- `streamUrl` is always playable
- `previewUrl` is valid for `react-native-video`

### Best Practice

Prefer this priority:

1. `storage`
2. `youtube`
3. `drive`

This means:

- sync Drive videos to Firebase Storage whenever possible
- RN should treat Drive playback as fallback compatibility mode

### Suggested RN UX

- for `storage` videos
  - show normal in-app player
- for `youtube` videos
  - show embedded YouTube experience
- for `drive` videos
  - show WebView player first
  - if WebView fails, open external Drive link
  - optionally show message:
    - `This video is still served from Google Drive and may open in Google Drive if needed.`

## Suggested RN Types For Videos

```ts
export type VideoLibraryItem = {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  provider: "youtube" | "drive" | "storage";
  accessTier: "free" | "paid";
  effectiveAccessTier: "free" | "paid";
  sectionId: string;
  sectionTitleSnapshot?: string;
  thumbnailUrl?: string;
  storagePath?: string;
  storageBucket?: string;
  mimeType?: string;
};

export type VideoLibraryResponse = {
  tier: "guest" | "free" | "paid";
  videos: VideoLibraryItem[];
};

export type VideoPlayResponse = {
  video: {
    id: string;
    title: string;
    description: string;
    accessTier: "free" | "paid";
    effectiveAccessTier: "free" | "paid";
    sectionAccessTier: "free" | "paid";
    provider: "youtube" | "drive" | "storage";
    sectionId: string;
    thumbnailUrl?: string;
    storagePath?: string;
    mimeType?: string;
    requiresGoogleSession: boolean;
  };
  playback:
    | {
        provider: "storage";
        url: string;
        mimeType: string;
        storagePath: string;
      }
    | {
        provider: "drive";
        driveFileId: string;
        streamUrl: string;
        previewUrl: string;
        webViewUrl: string;
        accountEmail?: string | null;
      }
    | {
        provider: "youtube";
        url: string;
      };
  user: {
    uid?: string | null;
    tier?: "guest" | "free" | "paid" | null;
    email?: string | null;
    accountEmail?: string | null;
  } | null;
};
```

## Error Handling

### `401 Unauthorized`

Means:

- token missing
- token invalid

RN action:

- force re-auth or refresh token

### `403 Forbidden`

Means:

- user is authenticated
- route is locked for that tier

RN action:

- show upgrade or complete-profile CTA based on `access.requiredTier`

## Important Backend Notes

- Use the new `/api/app/*` routes for RN gated content
- Existing admin routes remain in place for the CMS
- Admin-side tier promotion now also syncs paid Drive access when moving a user to `paid`

## Suggested RN Service Layer

Create a thin wrapper like:

- `validateUser()`
- `getAccess()`
- `getQuizzes()`
- `getQuizDetails(id)`
- `getMocks()`
- `getMockDetails(id)`
- `submitMockAttempt(id, marks)`
- `getVivaCases()`
- `submitVivaAttempt(payload)`
- `getVideoLibrary(sectionId?)`

Each function should automatically attach the Firebase ID token.

## Example RN Fetch Wrapper

```ts
import auth from "@react-native-firebase/auth";

const API_BASE_URL = "https://your-api-domain.com";

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const user = auth().currentUser;

  if (!user) {
    throw new Error("User not authenticated");
  }

  const token = await user.getIdToken();

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error || "API request failed");
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data as T;
}
```

## Example RN Service Calls

```ts
export async function validateUserWithToken(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/validate-user`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error || "Validation failed");
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data;
}

export async function finalizeGoogleSignIn(token: string) {
  const response = await fetch(`${API_BASE_URL}/api/auth/google/complete`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await response.json();

  if (!response.ok) {
    const error = new Error(data?.error || "Google finalize failed");
    (error as any).status = response.status;
    (error as any).data = data;
    throw error;
  }

  return data;
}

export async function validateUser() {
  return apiFetch("/api/validate-user", {
    method: "POST",
  });
}

export async function getAppAccess() {
  return apiFetch("/api/app/access");
}

export async function getQuizzes(type?: "chapter" | "mock" | "grand-mock") {
  const search = type ? `?type=${type}` : "";
  return apiFetch(`/api/app/quizzes${search}`);
}

export async function getQuizDetails(id: string) {
  return apiFetch(`/api/app/quizzes/${id}`);
}

export async function getMocks() {
  return apiFetch("/api/app/mocks");
}

export async function getMockDetails(id: string) {
  return apiFetch(`/api/app/mocks/${id}`);
}

export async function submitMockAttempt(id: string, marks: number) {
  return apiFetch(`/api/app/mocks/${id}/attempts`, {
    method: "POST",
    body: JSON.stringify({ marks }),
  });
}

export async function getVivaCases() {
  return apiFetch("/api/app/viva-cases");
}

export async function submitVivaAttempt(caseId: string, report: unknown) {
  return apiFetch("/api/app/viva-attempts", {
    method: "POST",
    body: JSON.stringify({ caseId, report }),
  });
}

export async function getVideoLibrary(sectionId?: string) {
  const search = sectionId ? `?sectionId=${sectionId}` : "";
  return apiFetch(`/api/app/videos/library${search}`);
}

export async function getVideoPlay(id: string) {
  return apiFetch(`/api/app/videos/${id}/play`);
}

export function getVideoStreamUrl(id: string) {
  return `${API_BASE_URL}/api/app/videos/${id}/stream`;
}
```

## Suggested UI Rules

- `guest`
  - chapter quiz card: locked
  - mocks: locked
  - grand mocks: locked
  - AI viva: locked
- `free`
  - chapter quiz card: preview badge
  - mocks: weekly preview badge
  - grand mocks: weekly preview badge
  - AI viva: locked
- `paid`
  - all unlocked

## RN Smoke Test Checklist

Run this once after wiring the mobile app:

1. Log in anonymously.
   Expected:
   - `POST /api/validate-user` returns `tier: "guest"`
   - `GET /api/app/quizzes` shows chapter quizzes with `access.allowed: false`
   - `GET /api/app/mocks` returns `403`
   - `GET /api/app/viva-cases` returns `403`

2. Complete profile with a normal signed-in user.
   Expected:
   - `POST /api/validate-user` returns `tier: "free"`
   - `GET /api/app/quizzes` shows chapter quizzes with `access.mode: "preview"`
   - `GET /api/app/quizzes/:id` returns only `4` questions
   - `GET /api/app/mocks` returns preview metadata
   - `GET /api/app/mocks/:id` returns only the allowed weekly preview slice
   - `GET /api/app/viva-cases` returns `403`

3. Upgrade the same user to paid.
   Expected:
   - `POST /api/upgrade-user` returns `tier: "paid"`
   - `GET /api/app/quizzes/:id` returns full question set
   - `GET /api/app/mocks` returns mock list
   - `GET /api/app/viva-cases` returns viva cases
   - `GET /api/app/videos/library` includes paid videos

4. Submit a mock attempt as paid.
   Expected:
   - `POST /api/app/mocks/:id/attempts` succeeds
   - server uses authenticated user identity, not caller-supplied email

5. Submit a viva attempt as paid.
   Expected:
   - `POST /api/app/viva-attempts` succeeds
   - server uses authenticated user identity

6. Open a paid video as paid.
   Expected:
   - `GET /api/app/videos/library` returns visible sectioned video data
   - `GET /api/app/videos/:id/play` returns:
     - `provider: "storage"` for synced videos
     - or `provider: "drive"` with `streamUrl`, `previewUrl`, and `webViewUrl` for unsynced Drive videos

## Recommended Error UX

- `401`
  - show session-expired state
  - refresh token or send user back through login

- `403` with `requiredTier: "free"`
  - show complete-profile CTA

- `403` with `requiredTier: "paid"`
  - show upgrade/paywall CTA
