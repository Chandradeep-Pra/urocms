# Public Viva Quickstart

This is the minimal guide for an external website to use public AI viva cases.

## 1. Fetch all public cases

```http
GET /api/public/viva-cases
```

Use this when you want to show a list of publicly available viva cases.

## 2. Fetch one public case

```http
GET /api/public/viva-cases/:id
```

Use this when the user selects one case and you need the full viva payload.

## 3. Capture name and email before starting

Before the viva begins, ask the user for:

- `name`
- `email`

Then call:

```http
POST /api/public/viva-cases/:id/start
Content-Type: application/json
```

Example body:

```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "source": "external-web"
}
```

## 4. Start the viva

After the `/start` call succeeds, the rest of the viva flow stays the same as your current starting flow.

This public start endpoint only does the pre-viva capture step.

## Notes

- No auth token is required.
- Only cases marked as `public` are returned.
- Visitor details are captured and shown in the admin viva case page under `Public Starts`.
