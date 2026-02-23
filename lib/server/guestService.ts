import { adminDb } from "@/lib/firebaseAdmin";

export interface GuestUser {
  id: string;               // UID
  email: string;
  tier: "guest";
  createdAt: string;
  source?: string;
}

export async function getGuestUsers(): Promise<GuestUser[]> {
  const snapshot = await adminDb
    .collection("users")
    .where("tier", "==", "guest")
    .orderBy("createdAt", "desc")
    .get();

  return snapshot.docs.map((doc) => {
    const data = doc.data();


    return {
      id: doc.id, // 🔥 UID now
      email: data.email ?? "",
      tier: "guest",
      source: data.source ?? "mobile-app",
      createdAt: data.createdAt
        ? data.createdAt.toDate().toISOString().split("T")[0]
        : "-",
    };
  });
}
