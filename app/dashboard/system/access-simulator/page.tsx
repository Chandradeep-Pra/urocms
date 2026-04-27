import AccessSimulatorClient from "@/components/dashboard/AccessSimulatorClient";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

interface SimulatorSnapshot {
  debug: {
    firebaseProjectId: string | null;
    storageBucket: string | null;
    querySummary: Array<{
      key: string;
      label: string;
      count: number;
      empty: boolean;
    }>;
  };
  counts: {
    chapters: number;
    chapterTests: number;
    questionBanks: number;
    mocks: number;
    grandMocks: number;
    vivaCases: number;
    guestUsers: number;
    freeUsers: number;
    paidUsers: number;
  };
  chapters: Array<{
    id: string;
    title: string;
    difficulty: string;
    isPremium: boolean;
    estimatedTimeMin: number | null;
  }>;
}

async function getSimulatorSnapshot(): Promise<SimulatorSnapshot> {
  const [
    chaptersSnap,
    questionBanksSnap,
    mocksSnap,
    vivaCasesSnap,
    guestUsersSnap,
    freeUsersSnap,
    paidUsersSnap,
  ] = await Promise.all([
    adminDb.collection("chapters").where("isActive", "==", true).get(),
    adminDb.collection("questionBanks").where("isActive", "==", true).get(),
    adminDb.collection("mocks").get(),
    adminDb.collection("vivaCases").where("isActive", "==", true).get(),
    adminDb.collection("users").where("tier", "==", "guest").get(),
    adminDb.collection("users").where("tier", "==", "free").get(),
    adminDb.collection("users").where("tier", "==", "paid").get(),
  ]);

  const chapters = chaptersSnap.docs
    .map((doc) => {
      const data = doc.data();

      return {
        id: doc.id,
        title: String(data.title ?? doc.id),
        difficulty: String(data.difficulty ?? "medium"),
        isPremium: Boolean(data.isPremium),
        estimatedTimeMin:
          typeof data.estimatedTimeMin === "number" ? data.estimatedTimeMin : null,
        nodeType: String(data.nodeType ?? "GROUP"),
        order: typeof data.order === "number" ? data.order : 0,
      };
    })
    .sort((a, b) => a.order - b.order);

  const chapterTests = chapters.filter((chapter) => chapter.nodeType === "TEST");
  const mockDocs = mocksSnap.docs.map((doc) => doc.data());
  const mocks = mockDocs.filter((item) => item.type === "mock").length;
  const grandMocks = mockDocs.filter((item) => item.type === "grand-mock").length;
  const counts = {
    chapters: chapters.length,
    chapterTests: chapterTests.length,
    questionBanks: questionBanksSnap.size,
    mocks,
    grandMocks,
    vivaCases: vivaCasesSnap.size,
    guestUsers: guestUsersSnap.size,
    freeUsers: freeUsersSnap.size,
    paidUsers: paidUsersSnap.size,
  };

  return {
    debug: {
      firebaseProjectId: process.env.FIREBASE_PROJECT_ID ?? null,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET ?? null,
      querySummary: [
        {
          key: "chapters",
          label: "Chapters (isActive=true)",
          count: counts.chapters,
          empty: counts.chapters === 0,
        },
        {
          key: "questionBanks",
          label: "Question Banks (isActive=true)",
          count: counts.questionBanks,
          empty: counts.questionBanks === 0,
        },
        {
          key: "mocks",
          label: "Mocks",
          count: counts.mocks,
          empty: counts.mocks === 0,
        },
        {
          key: "grandMocks",
          label: "Grand Mocks",
          count: counts.grandMocks,
          empty: counts.grandMocks === 0,
        },
        {
          key: "vivaCases",
          label: "Viva Cases (isActive=true)",
          count: counts.vivaCases,
          empty: counts.vivaCases === 0,
        },
        {
          key: "guestUsers",
          label: "Users where tier=guest",
          count: counts.guestUsers,
          empty: counts.guestUsers === 0,
        },
        {
          key: "freeUsers",
          label: "Users where tier=free",
          count: counts.freeUsers,
          empty: counts.freeUsers === 0,
        },
        {
          key: "paidUsers",
          label: "Users where tier=paid",
          count: counts.paidUsers,
          empty: counts.paidUsers === 0,
        },
      ],
    },
    counts,
    chapters: chapterTests.slice(0, 8).map((chapter) => ({
      id: chapter.id,
      title: chapter.title,
      difficulty: chapter.difficulty,
      isPremium: chapter.isPremium,
      estimatedTimeMin: chapter.estimatedTimeMin,
    })),
  };
}

export default async function AccessSimulatorPage() {
  const snapshot = await getSimulatorSnapshot();

  return <AccessSimulatorClient snapshot={snapshot} />;
}
