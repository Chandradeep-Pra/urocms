import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const snapshot = await adminDb.collection("dailyQuizzes").get();

    const quizzes = snapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }))
      .sort((a: any, b: any) => {
        const aId = String(a.id || "");
        const bId = String(b.id || "");

        if (/^\d{4}-\d{2}-\d{2}$/.test(aId) && /^\d{4}-\d{2}-\d{2}$/.test(bId)) {
          return bId.localeCompare(aId);
        }

        const aCreatedAt =
          typeof a.createdAt === "object" && a.createdAt?._seconds
            ? a.createdAt._seconds * 1000
            : new Date(a.createdAt || 0).getTime();
        const bCreatedAt =
          typeof b.createdAt === "object" && b.createdAt?._seconds
            ? b.createdAt._seconds * 1000
            : new Date(b.createdAt || 0).getTime();

        return bCreatedAt - aCreatedAt;
      });

    return NextResponse.json(
      { quizzes },
      {
        headers: {
          "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
        },
      }
    );
  } catch (error) {
    console.error("Daily quiz history fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch quiz history" },
      { status: 500 }
    );
  }
}
