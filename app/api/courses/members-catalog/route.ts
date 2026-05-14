import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("users").orderBy("createdAt", "desc").get();

    const users = snapshot.docs.map((doc) => {
      const data = doc.data() ?? {};
      return {
        id: doc.id,
        name: String(data.name || "").trim(),
        email: String(data.email || "").trim(),
        tier: data.tier === "paid" ? "paid" : data.tier === "free" ? "free" : "guest",
        activeCourseIds: Array.isArray(data.activeCourseIds) ? data.activeCourseIds : [],
      };
    });

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Course members catalog fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}
