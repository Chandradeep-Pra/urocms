type Candidate = { uid?: string; email?: string; name?: string };
type Attempt = {
  candidate?: Candidate;
  email?: string;
  createdAt?: string;
  submittedAt?: string;
  attemptNumber?: number;
};

// Older versions archived the first score and replaced it with each retake.
// Include that history so existing candidates retain their original rank.
export function firstMockAttempts<T extends Attempt>(attempts: T[], history: T[] = []): T[] {
  const candidates = new Map<string, T>();
  for (const attempt of [...history, ...attempts]) {
    const email = String(attempt.candidate?.email || attempt.email || "").trim().toLowerCase();
    const key = email || attempt.candidate?.uid || "";
    if (!key) continue;
    const existing = candidates.get(key);
    const time = Date.parse(attempt.createdAt || attempt.submittedAt || "") || Infinity;
    const existingTime = existing ? Date.parse(existing.createdAt || existing.submittedAt || "") || Infinity : Infinity;
    if (!existing || time < existingTime || (time === existingTime && (attempt.attemptNumber ?? 1) < (existing.attemptNumber ?? 1))) {
      candidates.set(key, attempt);
    }
  }
  return [...candidates.values()];
}

export function normalizeMockAnswers(value: unknown): Record<string, number> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return Object.fromEntries(Object.entries(value).filter(([, answer]) => typeof answer === "number" && Number.isInteger(answer) && answer >= 0 && answer < 5));
}
