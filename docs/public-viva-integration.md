# Public Viva Integration Guide

This guide explains the minimal public AI viva flow for an external website.

## Objective

Allow a viva case to be exposed publicly without app authentication, while still capturing the visitor's `name` and `email` before they start.

This does **not** replace the protected viva flow already used inside the app. It is a separate public path for selected cases only.

## Admin Setup

In the admin viva case editor:

1. Open the viva case.
2. Set `Access Type` to `Public access`.
3. Save the case.

Only cases with `accessType = "public"` can be fetched through the public route.

## Public API Endpoints

### 0. Fetch all public viva cases

```http
GET /api/public/viva-cases
```

Success response:

```json
{
  "cases": [
    {
      "id": "abc123",
      "accessType": "public",
      "case": {
        "title": "Ureteric Injury Viva",
        "level": "Intermediate",
        "stem": "A 45-year-old patient..."
      },
      "exhibits": [],
      "marking_criteria": {
        "must_mention": [],
        "critical_fail": []
      },
      "modes": {
        "calmAndComposed": {
          "enabled": true
        },
        "fastAndFurious": {
          "enabled": false,
          "questionCount": 3,
          "questions": []
        }
      },
      "isActive": true
    }
  ]
}
```

### 1. Fetch a public viva case

```http
GET /api/public/viva-cases/:id
```

Use this when the external website already knows the viva case id.

Success response:

```json
{
  "case": {
    "id": "abc123",
    "folderId": "",
    "folderName": "",
    "accessType": "public",
    "case": {
      "title": "Ureteric Injury Viva",
      "level": "Intermediate",
      "stem": "A 45-year-old patient...",
      "objectives": ["...", "..."]
    },
    "exhibits": [],
    "marking_criteria": {
      "must_mention": [],
      "critical_fail": []
    },
    "modes": {
      "calmAndComposed": {
        "enabled": true
      },
      "fastAndFurious": {
        "enabled": false,
        "questionCount": 3,
        "questions": []
      }
    },
    "isActive": true
  }
}
```

If the case is not public or not active, this returns `404`.

### 2. Capture visitor details before starting the viva

```http
POST /api/public/viva-cases/:id/start
Content-Type: application/json
```

Request body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "source": "marketing-site"
}
```

`source` is optional. If omitted, the backend uses `external-web`.

Success response:

```json
{
  "success": true,
  "participant": {
    "name": "John Doe",
    "email": "john@example.com",
    "source": "marketing-site",
    "status": "started",
    "startedAt": "2026-05-23T12:34:56.000Z"
  }
}
```

## Recommended External Website Flow

### Step 1

Load the case by id:

```ts
const vivaRes = await fetch(`${API_BASE}/api/public/viva-cases/${caseId}`);
const vivaData = await vivaRes.json();
```

### Step 2

Before showing the viva UI, ask for:

- full name
- email

### Step 3

When the user clicks `Start Viva`, capture the lead:

```ts
await fetch(`${API_BASE}/api/public/viva-cases/${caseId}/start`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    name,
    email,
    source: "marketing-site",
  }),
});
```

### Step 4

After the start call succeeds, continue into the viva experience on the external site.

## What Gets Captured

The backend stores the visitor in two places:

1. `vivaCases/{caseId}.publicParticipants`
2. `publicVivaAttempts` collection

This keeps the implementation minimal while also making the captured names/emails visible directly inside the admin viva case detail page.

## Admin Visibility

For public cases, the admin viva case detail page now shows:

- visitor name
- visitor email
- source
- started timestamp

This appears under the `Public Starts` section.

## Important Notes

- No Firebase auth is required for these public endpoints.
- Only cases explicitly marked as `public` are accessible through them.
- Protected app viva routes are unchanged.
- The public start endpoint is meant for lead capture before the viva begins.

## Minimal Frontend Validation

On the external website, validate:

- `name` is non-empty
- `email` is non-empty
- `email` looks like an email address

The backend also performs basic validation and will return `400` if required values are missing.

## Suggested Error Handling

If `GET /api/public/viva-cases/:id` returns `404`:

- show `This viva case is not publicly available.`

If `POST /api/public/viva-cases/:id/start` returns `400`:

- show `Please enter your name and a valid email.`

If it returns `500`:

- show `We could not start the viva right now. Please try again.`
