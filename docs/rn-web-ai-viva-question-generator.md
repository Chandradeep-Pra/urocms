# RN and Web Integration: AI Viva Question Generator

This guide shows how an **admin React Native app** or **admin web app** can generate sample viva questions from a case using the CMS API.

> This endpoint is admin-only. Do not call it from the candidate viva player. Candidate apps should consume questions already saved on the viva case.

## Endpoint

```http
POST /api/viva-cases/generate-questions
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

Set the API origin for each environment:

```ts
export const API_BASE_URL = "https://your-cms-domain.com";
```

The signed-in Firebase user's normalized email must be present in the server's `ADMIN_ALLOWED_EMAILS` list. A normal signed-in candidate token receives `403`.

The CMS server requires `GEMINI_API_KEY`. The RN/web client must never receive or store this key.

## Request

```ts
export type VivaGenerationMode = "calmAndComposed" | "fastAndFurious";

export interface GenerateVivaQuestionsRequest {
  mode: VivaGenerationMode;
  questionCount: number;
  title: string;
  level: string;
  stem: string;
  objectives: string[];
  mustMention: string[];
  criticalFail: string[];
  exhibits: Array<{
    id: string;
    label: string;
    description: string;
  }>;
}
```

Example:

```json
{
  "mode": "calmAndComposed",
  "questionCount": 5,
  "title": "Post-operative ureteric injury",
  "level": "Intermediate",
  "stem": "A 52-year-old patient develops flank pain after pelvic surgery...",
  "objectives": ["Recognise ureteric injury", "Plan initial management"],
  "mustMention": ["Assess haemodynamic stability", "Urgent upper tract drainage if septic"],
  "criticalFail": ["Delay drainage in an obstructed septic patient"],
  "exhibits": [
    {
      "id": "exhibit-cystoscopy-1",
      "label": "CT urogram",
      "description": "Delayed phase image showing contrast extravasation"
    }
  ]
}
```

Rules enforced by the server:

- `stem` is required.
- `questionCount` is clamped to `1–15`.
- Unknown modes fall back to `calmAndComposed`.
- Context lists are bounded before being sent to the model.
- Exhibit image URLs are not sent to the model; only labels and descriptions are used.

## Response

```ts
export interface GeneratedVivaQuestion {
  question: string;
  answerKeywords: string[];
  linkedExhibitIds: string[];
}

export interface GenerateVivaQuestionsResponse {
  questions: GeneratedVivaQuestion[];
}
```

```json
{
  "questions": [
    {
      "question": "How would you assess this patient initially?",
      "answerKeywords": [
        "haemodynamic stability",
        "sepsis",
        "renal function",
        "urine output",
        "examination"
      ],
      "linkedExhibitIds": []
    },
    {
      "question": "Which investigations would you request next, and why?",
      "answerKeywords": ["blood tests", "renal function", "CT urogram", "delayed phase"],
      "linkedExhibitIds": ["exhibit-cystoscopy-1"]
    }
  ]
}
```

Generated questions do not have their own question `id`. The editor must create or preserve that ID when merging. `linkedExhibitIds` contains at most one valid supplied exhibit ID and is empty when the question does not require an image.

## Shared API client

Use a fresh Firebase ID token for each request:

```ts
import type { User } from "firebase/auth";

export async function generateVivaQuestions(
  user: User,
  input: GenerateVivaQuestionsRequest
): Promise<GenerateVivaQuestionsResponse> {
  const token = await user.getIdToken();
  const response = await fetch(
    `${API_BASE_URL}/api/viva-cases/generate-questions`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(input),
    }
  );

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new VivaGenerationError(
      response.status,
      data?.error || "Unable to generate viva questions"
    );
  }

  return data as GenerateVivaQuestionsResponse;
}

export class VivaGenerationError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "VivaGenerationError";
  }
}
```

## React Native integration

This example assumes Firebase Auth is already configured in the RN admin app.

```tsx
import React, { useState } from "react";
import { ActivityIndicator, Alert, Pressable, Text } from "react-native";
import { getAuth } from "firebase/auth";

export function GenerateQuestionsButton({ caseDraft, mode, applyQuestions }) {
  const [generating, setGenerating] = useState(false);

  const onGenerate = async () => {
    const user = getAuth().currentUser;
    if (!user) {
      Alert.alert("Sign in required", "Please sign in with an admin account.");
      return;
    }

    if (!caseDraft.case.stem.trim()) {
      Alert.alert("Case stem required", "Add the case stem before generating questions.");
      return;
    }

    setGenerating(true);
    try {
      const result = await generateVivaQuestions(user, {
        mode,
        questionCount: caseDraft.modes[mode].questionCount,
        title: caseDraft.case.title,
        level: caseDraft.case.level,
        stem: caseDraft.case.stem,
        objectives: caseDraft.case.objectives,
        mustMention: caseDraft.marking_criteria.must_mention,
        criticalFail: caseDraft.marking_criteria.critical_fail,
        exhibits: caseDraft.exhibits.map(({ id, label, description }) => ({
          id,
          label,
          description,
        })),
      });

      applyQuestions(result.questions);
      Alert.alert("Questions generated", "Review every question before saving the case.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Generation failed";
      Alert.alert("Could not generate questions", message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Pressable disabled={generating} onPress={onGenerate}>
      {generating ? <ActivityIndicator /> : <Text>Generate sample questions with AI</Text>}
    </Pressable>
  );
}
```

If RN reports a network failure while using a local API:

- iOS simulator: use the Mac's reachable host address or `localhost` as supported by the setup.
- Android emulator: commonly use `http://10.0.2.2:<port>` for a server running on the development machine.
- Physical device: use a LAN-reachable HTTPS/HTTP host permitted by the platform network policy.

## Web app integration

```tsx
import { useState } from "react";
import { auth } from "./firebase";

export function GenerateQuestionsButton({ caseDraft, mode, applyQuestions }) {
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onGenerate = async () => {
    const user = auth.currentUser;
    if (!user) {
      setError("Please sign in with an admin account.");
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const result = await generateVivaQuestions(user, {
        mode,
        questionCount: caseDraft.modes[mode].questionCount,
        title: caseDraft.case.title,
        level: caseDraft.case.level,
        stem: caseDraft.case.stem,
        objectives: caseDraft.case.objectives,
        mustMention: caseDraft.marking_criteria.must_mention,
        criticalFail: caseDraft.marking_criteria.critical_fail,
        exhibits: caseDraft.exhibits.map(({ id, label, description }) => ({
          id,
          label,
          description,
        })),
      });

      applyQuestions(result.questions);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div>
      <button type="button" disabled={generating || !caseDraft.case.stem.trim()} onClick={onGenerate}>
        {generating ? "Generating…" : "Generate sample questions with AI"}
      </button>
      {error && <p role="alert">{error}</p>}
    </div>
  );
}
```

If the web app is hosted on a different origin, proxy this call through the web app's backend or explicitly configure a narrow CORS policy on the CMS. A same-origin backend proxy is preferred. Never proxy without checking the Firebase token and admin allow-list.

## Merge generated questions into the case draft

Preserve existing IDs and exhibit links by array position where possible. Generate new local IDs for additional questions:

```ts
function mergeGeneratedQuestions(
  existing: VivaQuestionConfig[],
  generated: GeneratedVivaQuestion[]
): VivaQuestionConfig[] {
  return generated.map((item, index) => ({
    id: existing[index]?.id ?? `question-${crypto.randomUUID()}`,
    question: item.question,
    answerKeywords: item.answerKeywords,
    linkedExhibitIds: item.linkedExhibitIds,
  }));
}

function applyGeneratedQuestions(mode: VivaGenerationMode, generated: GeneratedVivaQuestion[]) {
  setCaseDraft((current) => {
    const questions = mergeGeneratedQuestions(current.modes[mode].questions, generated);

    return {
      ...current,
      modes: {
        ...current.modes,
        [mode]: {
          ...current.modes[mode],
          questionCount: questions.length,
          questions,
        },
      },
    };
  });
}
```

For React Native runtimes without `crypto.randomUUID()`, use the UUID package already used by the app or another collision-resistant local ID helper.

## Save after review

Generation does not write to Firestore. After the admin reviews/edits the result, save through the existing case endpoint:

```http
PATCH /api/viva-cases/:caseId
Authorization: Bearer <firebase-id-token>
Content-Type: application/json
```

Send the complete case payload, including both mode objects. Each saved question must have:

```json
{
  "id": "question-id",
  "question": "Examiner prompt",
  "answerKeywords": ["keyword"],
  "linkedExhibitIds": ["optional-exhibit-id"]
}
```

## Error handling

| Status | Meaning | Client behavior |
| --- | --- | --- |
| `400` | The case stem is missing | Keep the editor open and focus the stem field |
| `401` | Token missing, invalid or expired | Refresh the Firebase token once; otherwise sign in again |
| `403` | User is signed in but is not an allowed admin | Show “Admin access required”; do not retry |
| `500` | AI configuration, provider, parsing or server failure | Keep existing questions unchanged and allow manual retry |

Use a 60–90 second client timeout. Disable repeat clicks while the request is active. Do not clear existing questions until a valid response has arrived.

## Recommended review checklist

Before saving, the admin should verify:

- Questions follow a logical examiner conversation.
- No question assumes a finding absent from the stem or exhibits.
- Wording matches the selected candidate level.
- Questions do not reveal their answers.
- Answer keywords are clinically correct and sufficiently specific.
- Critical safety decisions are represented.
- Existing exhibit links still match the generated questions.
