import { createHash } from "node:crypto";
import { normalizeMockAnswers } from "@/lib/server/mockAttempts";

type Data = Record<string, unknown>;
export type MockCandidate = { uid?: string | null; name?: string | null; email?: string | null };
export type MockCompletion = {
  candidate: MockCandidate;
  marks: number;
  totalQuestions: number | null;
  timeTakenSeconds: number | null;
  submittedAt: string;
  submissionId: string | null;
  fingerprint: string;
  isFirstAttempt: boolean;
};
export type AdminMockAttemptRow = {
  candidate: { name: string; email: string };
  marks: number;
  totalAttempts: number;
  timeTakenSeconds: number | null;
  timedAttempts: number;
};

function object(value: unknown): Data {
  return value && typeof value === "object" ? value as Data : {};
}

export function recordedMockSeconds(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

export function mockCompletionFingerprint(input: Data): string {
  const answers = normalizeMockAnswers(input.answers);
  return createHash("sha256").update(JSON.stringify({
    marks: Number(input.marks ?? input.score ?? 0),
    total: Number(input.totalQuestions ?? input.maxMarks ?? 0),
    seconds: recordedMockSeconds(input.timeTakenSeconds),
    answers: answers ? Object.entries(answers).sort(([a], [b]) => a.localeCompare(b)) : null,
  })).digest("hex");
}

export function createMockCompletion(candidate: MockCandidate, input: Data, submittedAt: string) {
  const email = String(candidate.email || "").trim().toLowerCase();
  const uid = String(candidate.uid || "").trim();
  const fingerprint = mockCompletionFingerprint(input);
  const submissionId = typeof input.submissionId === "string" && input.submissionId.trim()
    ? input.submissionId.trim().slice(0, 128) : null;
  // Older clients have no submission ID. Identical results, answers and timer
  // values are conservatively treated as a retry rather than inflating counts.
  const id = createHash("sha256").update(JSON.stringify([email || uid, submissionId || fingerprint])).digest("hex");
  const record: MockCompletion = {
    candidate: { uid: uid || null, name: String(candidate.name || "").trim(), email },
    marks: Number(input.marks ?? input.score ?? 0),
    totalQuestions: Number(input.totalQuestions ?? input.maxMarks ?? 0) || null,
    timeTakenSeconds: recordedMockSeconds(input.timeTakenSeconds),
    submittedAt, submissionId, fingerprint, isFirstAttempt: false,
  };
  return { id, record };
}

export function isOriginalMockCompletion(id: string, completion: MockCompletion, original?: Data) {
  if (!original) return true;
  if (original.completionKey) return original.completionKey === id;
  return !completion.submissionId && completion.fingerprint === mockCompletionFingerprint(original);
}

export function withOriginalMockCompletion(id: string, completion: MockCompletion, original?: Data) {
  const isFirstAttempt = isOriginalMockCompletion(id, completion, original);
  return {
    ...completion, isFirstAttempt,
    originalSubmittedAt: isFirstAttempt ? timestamp(original || completion) || null : null,
  };
}

function timestamp(input: Data): string {
  const value = input.createdAt || input.submittedAt;
  if (value && typeof value === "object" && "toDate" in value && typeof value.toDate === "function") {
    return value.toDate().toISOString();
  }
  const time = Date.parse(String(value || ""));
  return Number.isFinite(time) ? new Date(time).toISOString() : "";
}

export function mockAttemptSubmittedAt(input: Data): string | null {
  return timestamp(input) || null;
}

export function summarizeMockCompletions(originals: Data[], submissions: Data[]): AdminMockAttemptRow[] {
  type Event = { marks: number; seconds: number | null; timestamp: string };
  type Group = { candidate: AdminMockAttemptRow["candidate"]; events: Map<string, Event>; originalKey: string; ordinal: number; missingHistory: number };
  const groups = new Map<string, Group>();
  const groupFor = (input: Data) => {
    const candidate = object(input.candidate);
    const email = String(candidate.email || input.email || "").trim().toLowerCase();
    const key = email || String(candidate.uid || "").trim();
    if (!key) return null;
    let group = groups.get(key);
    if (!group) {
      group = { candidate: { name: "", email }, events: new Map(), originalKey: "", ordinal: 0, missingHistory: 0 };
      groups.set(key, group);
    }
    const name = String(candidate.name || input.name || "").trim();
    if (!group.candidate.name && name) group.candidate.name = name;
    return group;
  };
  const merge = (group: Group, key: string, input: Data) => {
    const event = group.events.get(key);
    const seconds = recordedMockSeconds(input.timeTakenSeconds);
    if (event) {
      if (event.seconds === null && seconds !== null) event.seconds = seconds;
    } else {
      group.events.set(key, { marks: Number(input.marks ?? input.score ?? 0), seconds, timestamp: timestamp(input) });
    }
  };
  // History and the private/public copies of one attempt share a timestamp.
  for (const input of originals) {
    const group = groupFor(input);
    if (!group) continue;
    const key = timestamp(input) || "undated-original";
    merge(group, key, input);
    const ordinal = Number(input.attemptNumber);
    group.ordinal = Math.max(group.ordinal, Number.isSafeInteger(ordinal) && ordinal > 0 ? ordinal : 1);
    const first = group.events.get(group.originalKey);
    if (!first || (timestamp(input) && (!first.timestamp || timestamp(input) < first.timestamp))) group.originalKey = key;
  }
  for (const group of groups.values()) group.missingHistory = Math.max(0, group.ordinal - group.events.size);
  for (const input of submissions) {
    const group = groupFor(input);
    if (!group) continue;
    const originalTime = timestamp({ submittedAt: input.originalSubmittedAt });
    const key = input.isFirstAttempt === true && originalTime ? originalTime
      : input.isFirstAttempt === true && group.originalKey ? group.originalKey
      : `submission:${String(input.id)}`;
    merge(group, key, input);
  }
  return [...groups.values()].map(group => {
    const events = [...group.events.values()];
    const first = group.events.get(group.originalKey) || [...events].sort((a, b) => (a.timestamp || "~").localeCompare(b.timestamp || "~"))[0];
    const timed = events.filter(event => event.seconds !== null);
    return {
      candidate: { ...group.candidate, name: group.candidate.name || "Unnamed candidate" },
      marks: first.marks,
      totalAttempts: events.length + group.missingHistory,
      timeTakenSeconds: timed.length ? timed.reduce((sum, event) => sum + event.seconds!, 0) : null,
      timedAttempts: timed.length,
    };
  }).sort((a, b) => a.candidate.name.localeCompare(b.candidate.name) || a.candidate.email.localeCompare(b.candidate.email));
}
