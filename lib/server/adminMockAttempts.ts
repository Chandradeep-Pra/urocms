import { getAdminAuth, getAdminDb } from "@/lib/firebaseAdmin";
import { summarizeMockCompletions, type MockCandidate } from "@/lib/server/mockAttemptTracking";

type Data = Record<string, unknown>;

export async function getAdminMockAttemptRows(mockId: string, mock: Data) {
  const db = getAdminDb();
  const originals: Data[] = [
    ...(Array.isArray(mock.history) ? mock.history : []),
    ...(Array.isArray(mock.attempts) ? mock.attempts : []),
  ];
  const submissions = await db.collection("mocks").doc(mockId).collection("submissions").get();
  const completions: Data[] = submissions.docs.map(doc => ({ ...doc.data(), id: doc.id }));
  const candidates = new Map<string, MockCandidate>();
  for (const input of [...originals, ...completions]) {
    const value = input.candidate as MockCandidate | undefined;
    const email = String(value?.email || input.email || "").trim().toLowerCase();
    const uid = String(value?.uid || "").trim();
    if (!email && !uid) continue;
    const existing = candidates.get(email || uid);
    candidates.set(email || uid, { name: value?.name || String(input.name || ""), email, uid: uid || existing?.uid });
  }
  const unresolved = [...candidates.values()].filter(candidate => candidate.email && !candidate.uid);
  for (let offset = 0; offset < unresolved.length; offset += 30) {
    const emails = unresolved.slice(offset, offset + 30).map(candidate => candidate.email!);
    const users = await db.collection("users").where("email", "in", emails)
      .select("email", "canonicalUserId", "isShadowDuplicate").get();
    for (const doc of users.docs) {
      const profile = doc.data();
      if (profile.isShadowDuplicate === true) continue;
      const candidate = candidates.get(String(profile.email || "").trim().toLowerCase());
      if (candidate) candidate.uid = String(profile.canonicalUserId || doc.id);
    }
  }
  const missing = [...candidates.values()].filter(candidate =>
    candidate.email && /^[^@\s]+@[^@\s]+$/.test(candidate.email) && !candidate.uid);
  for (let offset = 0; offset < missing.length; offset += 100) {
    const users = await getAdminAuth().getUsers(missing.slice(offset, offset + 100).map(candidate => ({ email: candidate.email! })));
    for (const user of users.users) {
      const candidate = candidates.get(String(user.email || "").trim().toLowerCase());
      if (candidate) candidate.uid = user.uid;
    }
  }
  const known = [...candidates.values()].filter(candidate => candidate.uid);
  // Direct per-student queries reuse existing indexes and avoid scanning other
  // students' activity or requiring a new collection-group index.
  for (let offset = 0; offset < known.length; offset += 20) {
    const records = await Promise.all(known.slice(offset, offset + 20).map(async candidate => {
      const attempts = await db.collection("mockAttempts").doc(candidate.uid!).collection("items")
        .where("mockId", "==", mockId).get();
      return attempts.docs.map(doc => ({ ...doc.data(), candidate }));
    }));
    originals.push(...records.flat());
  }
  return summarizeMockCompletions(originals, completions);
}
