# React Native Plan Search

Use this API to find subscription plans containing content that matches a natural-language question.

## Endpoint

```http
POST /api/public/plans/search
Content-Type: application/json
```

Request body:

```json
{
  "query": "I want to attend mock vivas on urology",
  "limit": 5
}
```

## React Native example

```ts
const API_URL = "https://your-domain.com";

export async function searchPlans(query: string) {
  const response = await fetch(`${API_URL}/api/public/plans/search`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, limit: 5 }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Unable to search plans");
  }

  return data;
}
```

Example usage:

```ts
const result = await searchPlans("mock vivas on urology");
setPlans(result.plans);
```

## Response

```json
{
  "query": "mock vivas on urology",
  "interpretedAs": {
    "topics": ["urology"],
    "contentTypes": ["ai-viva"],
    "keywords": ["mock viva"]
  },
  "plans": [
    {
      "id": "premium-plan",
      "name": "Urology Premium",
      "description": "Urology learning plan",
      "category": "FRCS",
      "currency": "GBP",
      "price": 99,
      "versions": [],
      "matchedBy": "content",
      "matchReason": "Verified content included through this plan's content or access scopes.",
      "matches": [
        {
          "id": "viva-id",
          "type": "ai-viva",
          "title": "Urology Mock Viva",
          "subtitle": "Viva · Urology",
          "courseIds": ["course-id"],
          "relevance": 11
        }
      ],
      "relevance": 11
    }
  ],
  "totalPlans": 1
}
```

Show `plans` in the results list and use each plan's `matches` to explain why it was returned. An empty `plans` array means no active plan contains matching content.

`matchedBy` is `content` when the result is verified against linked course content. If no linked content matches, the API can return `plan-info`, based on the plan's name, description, category, or features. Show `matchReason` in the UI so this distinction is clear.
