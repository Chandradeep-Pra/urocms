# Admin mock attempt reporting

Open **Assessments → Grand Mocks → a mock → Attempts**. Each student has one
row with Name, Email, Marks, Time spent, and Total attempts. The section uses
the existing admin-authenticated `GET /api/mocks/{id}` endpoint. Its response is
private and uncached; completion records are never added to public rankings.

Marks retain the first recorded score. Time spent sums the available durations
for completed attempts and is formatted as minutes and seconds. Break time is
excluded by the clients' timers. Missing timing displays **Not recorded**, and
partially timed histories show how many attempts have a saved duration.

The report combines `mocks/{id}.attempts`, archived `history`, and the matching
`mockAttempts/{uid}/items` records. Public/private copies with the same submission
timestamp count once. Known historical attempt numbers are retained even when
some old attempt records are missing. No migration or database writes happen
when opening the admin page.

New authenticated, public, and manually entered submissions also write to
`mocks/{id}/submissions/{completionKey}` in the same Firestore transaction as
the first-score handling. This tracks retakes without replacing first scores,
private first-attempt answers, or leaderboard statistics. Each record contains
the candidate identity, marks, question count, duration (nullable), submission
time, fingerprint, and whether it matches the original attempt. Answers are
hashed for duplicate detection, not copied into this collection.

Clients may pass a stable `submissionId` on the attempt POST: generate it once
per completed run, reuse it when retrying a failed request, and generate a new
one for a retake. Older clients use a fingerprint of marks, question count,
duration, and sorted answers. Identical payloads from those clients count once;
an identical retake cannot be distinguished from a network retry without a
submission ID. Testing Zone now sends its stable run ID and duration for both
signed-in and guest submissions. Older mobile clients retain fingerprint-based
compatibility.

Older discarded retakes cannot be recovered. Guest Testing Zone completions
saved before timing was forwarded may still have unknown durations. No platform
breakdown or unfinished-session tracking is introduced. Counts and durations
reflect the completion records available.

## Leaderboard order and completion times

The shared public/authenticated results API and Testing Zone fallback ranking
use the candidate's first recorded attempt, ordered by:

1. Marks, highest first.
2. Completion duration, shortest first when marks are equal.
3. Submission timestamp, earliest first when both score and duration match.
4. Email as a deterministic final fallback.

Unknown/invalid durations appear after known durations within the same score
group. They are never treated as zero. Zero is valid only when actually stored
as a numeric duration.

Older first-attempt durations are recovered read-only from a matching student's
private attempt with the exact same submission timestamp. Retake durations and
the admin table's cumulative time are never used to rank the first attempt.
Public responses add only `timeTakenSeconds`, not private answers or completion
logs. Testing Zone displays the time in the podium, candidate rows, and personal
rank card, with light/dark and narrow-screen layouts.
