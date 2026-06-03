import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebaseAdmin";
import { buildAppContentAccessContext } from "@/lib/server/appContentAccess";
import { requireAppUser } from "@/lib/server/appSession";

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const mockDoc = await adminDb.collection("mocks").doc(id).get();

    if (!mockDoc.exists) {
      return NextResponse.json({ error: "Mock not found" }, { status: 404 });
    }

    const mockData = mockDoc.data() ?? {};
    const isPublic = String(mockData.accessType || "restricted") === "public";
    const appAuth = isPublic ? null : await requireAppUser(req);
    if (appAuth && "response" in appAuth) return appAuth.response;
    const authUser = appAuth?.user ?? null;

    const accessContext = isPublic ? null : await buildAppContentAccessContext(authUser);
    const mockAccess = isPublic
      ? {
          allowed: true,
          mode: "public" as const,
          previewLimit: null,
          reason: null,
          courseIds: [],
        }
      : accessContext.getMockAccess({
          id: mockDoc.id,
          type: String(mockData.type || "mock"),
          accessType: String(mockData.accessType || "restricted"),
        });

    if (!mockAccess.allowed || mockAccess.mode === "locked") {
      return NextResponse.json(
        {
          error:
            mockAccess.reason ||
            "This mock is locked until the matching course or section is unlocked.",
          access: {
            tier: authUser?.tier ?? "guest",
            allowed: false,
            mode: "locked",
            previewLimit: null,
            requiredTier: null,
            reason: mockAccess.reason ?? null,
            courseIds: mockAccess.courseIds,
          },
        },
        { status: 403 }
      );
    }

    const quizDoc = await adminDb.collection("quizzes").doc(String(mockData.quizId || "")).get();

    if (!quizDoc.exists) {
      return NextResponse.json({ error: "Quiz not found" }, { status: 404 });
    }

    const quizData = quizDoc.data();
    let questions: any[] = [];

    if (quizData?.questionIds?.length) {
      const snapshots = await Promise.all(
        quizData.questionIds.map((qid: string) => adminDb.collection("questions").doc(qid).get())
      );

      questions = snapshots
        .filter((doc) => doc.exists)
        .map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
    } else if (quizData?.bankIds?.length) {
      const snapshot = await adminDb
        .collection("questions")
        .where("bankId", "in", quizData.bankIds)
        .where("isActive", "==", true)
        .get();

      questions = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
    }

    let visibleQuestions = questions;
    let accessPayload: Record<string, unknown> = {
      tier: authUser?.tier ?? "guest",
      allowed: mockAccess.allowed,
      mode: isPublic ? "public" : mockAccess.mode,
      previewLimit: mockAccess.previewLimit ?? null,
      totalQuestionCount: questions.length,
      returnedQuestionCount: questions.length,
      requiredTier: isPublic ? null : mockAccess.mode === "locked" ? "paid" : null,
      reason: mockAccess.reason ?? null,
      courseIds: mockAccess.courseIds,
      isPublic,
    };

    if (!isPublic && mockAccess.mode === "preview" && mockAccess.previewLimit) {
      visibleQuestions = questions.slice(0, mockAccess.previewLimit);
      accessPayload = {
        tier: authUser?.tier ?? "guest",
        allowed: mockAccess.allowed,
        mode: "preview",
        previewLimit: mockAccess.previewLimit,
        totalQuestionCount: questions.length,
        returnedQuestionCount: visibleQuestions.length,
        requiredTier: null,
        reason: mockAccess.reason ?? null,
        courseIds: mockAccess.courseIds,
        isPublic,
      };
    } else {
      accessPayload = {
        ...accessPayload,
        courseIds: mockAccess.courseIds,
      };
    }

    const { attempts, ...safeMockData } = mockData as Record<string, any>;

    return NextResponse.json({
      mock: {
        id: mockDoc.id,
        ...safeMockData,
        accessType: isPublic ? "public" : String(mockData.accessType || "restricted"),
        startTime: mockData?.startTime?.toDate?.()?.toISOString?.() ?? mockData?.startTime ?? null,
        endTime: mockData?.endTime?.toDate?.()?.toISOString?.() ?? mockData?.endTime ?? null,
        attemptsCount: Array.isArray(mockData?.attempts)
          ? mockData.attempts.length
          : mockData?.attemptsCount ?? 0,
        quiz: {
          id: quizDoc.id,
          ...quizData,
        },
        questions: visibleQuestions,
      },
      access: accessPayload,
    });
  } catch (error) {
    console.error("App mock fetch error:", error);
    return NextResponse.json({ error: "Failed to load mock" }, { status: 500 });
  }
}
