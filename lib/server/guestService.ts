import { adminDb } from "@/lib/firebaseAdmin";

export type UserTier = "guest" | "free" | "paid";

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  tier: UserTier;
  createdAt: string;
  source?: string;
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

function normalizeUser(doc: FirebaseFirestore.QueryDocumentSnapshot): AdminUser {
  const data = doc.data();
  const tier = data.tier;

  return {
    id: doc.id,
    name: data.name ?? "",
    email: data.email ?? "",
    tier: tier === "paid" || tier === "free" || tier === "guest" ? tier : "guest",
    source: data.source ?? "mobile-app",
    createdAt: formatCreatedAt(data.createdAt),
  };
}

export async function getGuestUsers(): Promise<AdminUser[]> {
  const snapshot = await adminDb
    .collection("users")
    .where("tier", "==", "guest")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map(normalizeUser);
}

export async function getAllUsers(): Promise<AdminUser[]> {
  const snapshot = await adminDb
    .collection("users")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map(normalizeUser);
}
