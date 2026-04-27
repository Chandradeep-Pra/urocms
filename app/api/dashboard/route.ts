import { NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";

type ChartPoint = {
  month: string;
  users: number;
};

function parseFirestoreDate(value: unknown): Date | null {
  if (!value) return null;

  if (typeof value === "object" && value !== null) {
    const v = value as { toDate?: () => Date; _seconds?: number };

    if (typeof v.toDate === "function") {
      return v.toDate();
    }

    if (typeof v._seconds === "number") {
      return new Date(v._seconds * 1000);
    }
  }

  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  return null;
}

function getLastSixMonths(): { label: string; end: Date }[] {
  const now = new Date();
  const months: { label: string; end: Date }[] = [];

  for (let i = 5; i >= 0; i -= 1) {
    const year = now.getFullYear();
    const month = now.getMonth() - i;

    const d = new Date(year, month, 1);
    const label = d.toLocaleString("en-US", { month: "short" });
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);

    months.push({ label, end });
  }

  return months;
}

function buildCumulativeUserGrowth(userCreatedAtDates: Date[]): ChartPoint[] {
  const buckets = getLastSixMonths();

  return buckets.map((bucket) => ({
    month: bucket.label,
    users: userCreatedAtDates.filter((d) => d.getTime() <= bucket.end.getTime()).length,
  }));
}

export async function GET() {
  try {
    const [
      usersSnap,
      questionsSnap,
      vivaCasesSnap,
      chaptersSnap,
      videoItemsSnap,
      quizzesSnap,
    ] = await Promise.all([
      adminDb.collection("users").get(),
      adminDb.collection("questions").get(),
      adminDb.collection("vivaCases").get(),
      adminDb.collection("chapters").where("isActive", "==", true).get(),
      adminDb.collection("videoItems").get(),
      adminDb.collection("quizzes").where("isActive", "==", true).get(),
    ]);

    const users = usersSnap.docs.map((doc) => doc.data());

    const totalUsers = users.length;
    const guestUsers = users.filter((u) => u.tier === "guest").length;
    const freeUsers = users.filter((u) => u.tier === "free").length;
    const paidUsers = users.filter((u) => u.tier === "paid").length;

    const userCreatedAt = users
      .map((u) => parseFirestoreDate(u.createdAt))
      .filter((d): d is Date => d instanceof Date);

    const userGrowth = buildCumulativeUserGrowth(userCreatedAt);

    const quizzes = quizzesSnap.docs.map((doc) => doc.data());
    const mockTests = quizzes.filter((q) => q.type === "mock").length;
    const grandMocks = quizzes.filter((q) => q.type === "grand-mock").length;

    return NextResponse.json({
      stats: {
        totalUsers,
        guestUsers,
        freeUsers,
        paidUsers,
        totalQuestions: questionsSnap.size,
        mockTests,
        grandMocks,
        vivaCases: vivaCasesSnap.size,
        chapters: chaptersSnap.size,
        videos: videoItemsSnap.size,
      },
      userGrowth,
      tierData: [
        { name: "Guest", value: guestUsers },
        { name: "Paid", value: paidUsers },
        { name: "Free", value: freeUsers },
      ],
    });
  } catch (error) {
    console.error("Dashboard metrics error:", error);
    return NextResponse.json({ error: "Failed to load dashboard metrics" }, { status: 500 });
  }
}
