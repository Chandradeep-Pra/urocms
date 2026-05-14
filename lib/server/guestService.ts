import { adminDb } from "@/lib/firebaseAdmin";

export type UserTier = "guest" | "free" | "paid";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  tier: UserTier;
  createdAt: string;
  source?: string;
  activeCourseIds?: string[];
  assignedCourses?: string[];
}

function formatCreatedAt(value: unknown) {
  if (!value) return "-";

  if (typeof value === "string" || value instanceof Date) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? "-" : parsed.toISOString().split("T")[0];
  }

  if (typeof value === "object" && value !== null && "toDate" in value) {
    const parsed = (value as { toDate: () => Date }).toDate();
    return Number.isNaN(parsed.getTime()) ? "-" : parsed.toISOString().split("T")[0];
  }

  return "-";
}

function normalizeUser(
  doc: FirebaseFirestore.QueryDocumentSnapshot,
  courseTitleMap: Record<string, string>
): AdminUser {
  const data = doc.data();
  const tier = data.tier;
  const activeCourseIds = Array.isArray(data.activeCourseIds) ? data.activeCourseIds : [];

  return {
    id: doc.id,
    name: data.name ?? "",
    email: data.email ?? "",
    tier: tier === "paid" || tier === "free" || tier === "guest" ? tier : "guest",
    source: data.source ?? "mobile-app",
    createdAt: formatCreatedAt(data.createdAt),
    activeCourseIds,
    assignedCourses: activeCourseIds
      .map((courseId) => courseTitleMap[courseId])
      .filter(Boolean),
  };
}

export async function getGuestUsers(): Promise<AdminUser[]> {
  const [snapshot, courseSnapshot] = await Promise.all([
    adminDb
      .collection("users")
      .where("tier", "==", "guest")
      .orderBy("createdAt", "desc")
      .get(),
    adminDb.collection("courses").get(),
  ]);

  const courseTitleMap = Object.fromEntries(
    courseSnapshot.docs.map((doc) => [doc.id, String(doc.data().title || doc.id)])
  );

  return snapshot.docs.map((doc) => normalizeUser(doc, courseTitleMap));
}

export async function getAllUsers(): Promise<AdminUser[]> {
  const [userSnapshot, courseSnapshot] = await Promise.all([
    adminDb.collection("users").orderBy("createdAt", "desc").get(),
    adminDb.collection("courses").get(),
  ]);

  const courseTitleMap = Object.fromEntries(
    courseSnapshot.docs.map((doc) => [doc.id, String(doc.data().title || doc.id)])
  );

  return userSnapshot.docs
    .map((doc) => normalizeUser(doc, courseTitleMap))
    .filter((user) => user.tier === "free" || user.tier === "paid");
}
