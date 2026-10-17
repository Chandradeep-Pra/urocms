# Experience feedback

Mock submission now saves the attempt first, then displays a skippable feedback
screen before the existing rank flow. It asks for question quality and overall
app experience. Ratings use five golden stars. A question rating of one or two
shows an optional reason; that reason is not stored if the rating is raised.
Both mock ratings are stored together, as requested.

When an AI viva ends, its audio connection closes before the feedback screen
appears. Scoring starts only after Submit or Skip. Viva feedback is one overall
rating with an optional comment. Report retries do not repeat feedback, and
leaving the screen cancels the pending continuation.

## Storage

| Platform / kind | Collection |
| --- | --- |
| Web mock (both ratings) | `mock_feedbacks` |
| Web AI viva | `viva_feedbacks` |
| General web app experience | `webapp_feedbacks` |
| Mobile feedback of any kind | `app_feedbacks` |

Every record includes its platform, kind, server timestamp, assessment ID/title
when applicable, candidate identity, and ratings. Assessment titles and signed-in
identities come from the backend. Public assessment submissions must match an
existing mock attempt or public viva participant. No record is created on Skip.
Retries reuse the same submission ID and cannot overwrite an existing review.

## APIs

- `POST /api/app/experience-feedback`: Firebase bearer token required. Platform
  defaults to `mobile`; Testing Zone explicitly forwards `web`.
- `POST /api/public/experience-feedback`: public web participants, platform fixed
  to `web` by the server.
- Testing Zone proxies the web form through `POST /web/api/experience-feedback`.
- `GET /api/experience-feedback`: admin only, with optional `category`, `cursor`,
  and `limit` (1–100, default 25). Returns `filters`, `items`, and `nextCursor`.

Example mobile mock review (both ratings stay in one `app_feedbacks` record):

```json
{
  "submissionId": "a-stable-uuid-for-this-attempt",
  "kind": "mock",
  "contextId": "MOCK_ID",
  "questionsRating": 2,
  "appRating": 4,
  "reason": "An optional explanation"
}
```

Viva requests use `kind: "viva"`, the viva case ID as `contextId`, `vivaRating`,
and optional `comment`. General web requests use `kind: "webapp"`; general mobile
requests use `kind: "app"`. Both use `appRating` and optional `comment`, without an
assessment ID. Ratings must be integers 1–5;
comments are limited to 2,000 characters. The mobile UI is not in these two
repositories; the endpoint is ready for its integration.

## CMS

System → Feedbacks opens `/dashboard/system/feedbacks`. Category badge names and
counts come from the backend, including empty categories. The inbox displays
ratings, comments, participant details, assessment title, source, and time.
Pagination merges the four collections while preserving records sharing the
same timestamp. Existing shareable Feedback Links are unchanged.

Collections are created automatically on the first successful feedback write;
there is no migration or collection-creation deployment step. Both apps must
be redeployed to activate the flow. New APIs and the existing admin guard keep
inbox access restricted to admins.

## Verification

Run `node --test tests/experience-feedback.test.cjs` in each repository. The main
repository also has `tests/browser/experience-feedback.cjs`, which uses mocked
services and temporary routes to check submission, Skip, failures, the live-viva
completion order, and the inbox. It defaults to local CMS port 3000 and Testing
Zone port 3028; override `CMS_TEST_ORIGIN` and `TESTING_TEST_ORIGIN` as needed.
Use `FEEDBACK_TEST_SCOPE=mock`, `viva`, or `cms` to run an individual browser case.
The existing Testing Zone mock-attempt browser regression now skips feedback
before verifying the original rank and answer-review flow.
