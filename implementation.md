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

## Recommended Error UX

- `401`
  - show session-expired state
  - refresh token or send user back through login

- `403` with `requiredTier: "free"`
  - show complete-profile CTA

- `403` with `requiredTier: "paid"`
  - show upgrade/paywall CTA
