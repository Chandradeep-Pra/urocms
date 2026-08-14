# AI Viva App and Web App Integration

This guide covers the shared question contract for the **Calm and Composed** and **Fast and Furious** AI viva modes. Both modes now return pre-authored questions in the same shape, so clients can use one player implementation.

## Base URLs and authentication

| Client | Endpoint | Authentication |
| --- | --- | --- |
| Signed-in app | `GET /api/viva-cases` and `GET /api/viva-cases/:id` | Firebase ID token using `Authorization: Bearer <token>` |
| Public web app | `GET /api/public/viva-cases` and `GET /api/public/viva-cases/:id` | None; only active cases with `accessType: "public"` are returned |
| Admin CMS | `POST /api/viva-cases`, `PATCH /api/viva-cases/:id` | Admin session/token |

Use the deployed CMS origin as `API_BASE`. For a browser hosted on another origin, configure the deployment/proxy so requests reach these same-origin Next.js routes.

## Shared response contract

Both modes contain `enabled`, `questionCount`, and `questions`:

```json
{
  "case": {
    "id": "abc123",
    "accessType": "public",
    "case": {
      "title": "Ureteric injury",
      "level": "Intermediate",
      "stem": "A patient presents after pelvic surgery...",
      "objectives": ["Recognise the injury", "Plan management"]
    },
    "exhibits": [
      {
        "id": "exhibit-1",
        "label": "CT urogram",
        "url": "https://cdn.example.com/ct.jpg",
        "description": "Delayed phase image"
      }
    ],
    "modes": {
      "calmAndComposed": {
        "enabled": true,
        "questionCount": 3,
        "questions": [
          {
            "id": "question-1",
            "question": "Please describe your initial assessment.",
            "answerKeywords": ["history", "examination", "stability"],
            "linkedExhibitIds": []
          }
        ]
      },
      "fastAndFurious": {
        "enabled": true,
        "questionCount": 3,
        "questions": [
          {
            "id": "question-2",
            "question": "What does this CT show?",
            "answerKeywords": ["contrast leak", "ureter"],
            "linkedExhibitIds": ["exhibit-1"]
          }
        ]
      }
    }
  }
}
```

`questionCount` is the configured slot count. A draft/admin response can contain blank question slots; candidate clients should display only questions whose `question.trim()` is non-empty. `answerKeywords` are assessment guidance and should not be revealed to the candidate during an attempt.

Older stored cases are response-normalized: if a mode did not previously contain questions, the API returns `questionCount: 0` and `questions: []`.

## Admin AI question generation

The CMS question setup includes **Generate sample questions with AI** for both modes. It sends the current case context to the admin-only endpoint:

```http
POST /api/viva-cases/generate-questions
Content-Type: application/json
Authorization: <admin session/token>
```

```json
{
  "mode": "calmAndComposed",
  "questionCount": 5,
  "title": "Ureteric injury",
  "level": "Intermediate",
  "stem": "A patient presents after pelvic surgery...",
  "objectives": ["Recognise the injury"],
  "mustMention": ["Assess stability"],
  "criticalFail": ["Delay drainage in sepsis"],
  "exhibits": [{ "label": "CT urogram", "description": "Delayed phase image" }]
}
```

The response is `{ "questions": [{ "question": "...", "answerKeywords": ["..."] }] }`. Generation populates the editor only; an admin must review and save the case. The endpoint requires `GEMINI_API_KEY` on the server and never exposes it to clients.

## One player for both modes

```ts
type ModeKey = "calmAndComposed" | "fastAndFurious";

function prepareViva(vivaCase: VivaCase, modeKey: ModeKey) {
  const mode = vivaCase.modes[modeKey];
  if (!mode.enabled) throw new Error("This mode is not enabled");

  const questions = mode.questions.filter((item) => item.question.trim());
  const exhibitById = new Map(vivaCase.exhibits.map((item) => [item.id, item]));

  return questions.map((item) => ({
    id: item.id,
    prompt: item.question,
    exhibits: item.linkedExhibitIds
      .map((id) => exhibitById.get(id))
      .filter(Boolean),
  }));
}
```

The player behavior can differ without changing the data model:

- Calm and Composed: no forced countdown, allow a deliberate answer, then advance.
- Fast and Furious: use the app's rapid timing/advance behavior.
- Keep mode labels as product labels; do not rely on them for parsing or storage. Use the camel-case keys.

## Signed-in mobile app flow

1. Obtain the signed-in user's Firebase ID token.
2. Fetch the available cases.
3. Respect the returned `access.allowed` and `access.mode` fields on list results.
4. Fetch the selected case by id before starting.
5. Select an enabled mode and pass it to the shared player.

```ts
const headers = { Authorization: `Bearer ${idToken}` };

const listResponse = await fetch(`${API_BASE}/api/viva-cases`, { headers });
if (!listResponse.ok) throw new Error("Unable to load viva cases");
const { cases } = await listResponse.json();

const caseResponse = await fetch(`${API_BASE}/api/viva-cases/${caseId}`, { headers });
if (caseResponse.status === 403) throw new Error("This viva is not in the user's course access");
if (!caseResponse.ok) throw new Error("Unable to load the viva");
const { case: vivaCase } = await caseResponse.json();
```

Do not cache the Firebase token permanently. Refresh it through the Firebase SDK and retry once on `401`.

## Public web app flow

1. Fetch public cases or a known case id.
2. Collect the participant's name and email.
3. Register the start.
4. Start the shared player only after the registration succeeds.

```ts
const caseResponse = await fetch(`${API_BASE}/api/public/viva-cases/${caseId}`);
if (caseResponse.status === 404) throw new Error("This viva is not publicly available");
const { case: vivaCase } = await caseResponse.json();

const startResponse = await fetch(
  `${API_BASE}/api/public/viva-cases/${caseId}/start`,
  {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email, source: "web-app" }),
  }
);
if (!startResponse.ok) throw new Error("Unable to start the viva");

const sessionQuestions = prepareViva(vivaCase, "calmAndComposed");
```

Public endpoints intentionally omit user allow-lists, attempts, participant lists, and attempt counts.

## Answer submission and AI evaluation

This CMS currently exposes case discovery and public-start capture. It does not define a candidate answer/evaluation endpoint. The app or web app should keep responses locally/in its existing attempt service until a server-side attempt endpoint is introduced. Never send `answerKeywords` to an untrusted AI prompt from the browser; perform grading server-side so marking guidance is not exposed.

Recommended answer payload for a future shared attempt API:

```json
{
  "caseId": "abc123",
  "mode": "calmAndComposed",
  "answers": [
    {
      "questionId": "question-1",
      "answer": "I would first assess haemodynamic stability..."
    }
  ]
}
```

## Client checks

- Ignore blank draft questions.
- Resolve exhibits by id and tolerate missing/deleted ids.
- Do not show answer keywords before or during the response.
- Handle `401` (sign-in), `403` (course access), `404` (missing/private), and `500` (retry) separately.
- Preserve `questionId` in every saved answer; array positions can change when an admin edits a case.
