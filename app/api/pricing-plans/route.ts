import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";

type PlanSelection = {
  chapterIds: string[];
  videoIds: string[];
  quizIds: string[];
  mockIds: string[];
  vivaCaseIds: string[];
};

function normalizeSelection(selection: Partial<PlanSelection> | undefined): PlanSelection {
  return {
    chapterIds: Array.isArray(selection?.chapterIds) ? selection!.chapterIds : [],
    videoIds: Array.isArray(selection?.videoIds) ? selection!.videoIds : [],
    quizIds: Array.isArray(selection?.quizIds) ? selection!.quizIds : [],
    mockIds: Array.isArray(selection?.mockIds) ? selection!.mockIds : [],
    vivaCaseIds: Array.isArray(selection?.vivaCaseIds) ? selection!.vivaCaseIds : [],
  };
}

function toCaseTitle(data: Record<string, any>) {
  return data?.case?.title || data?.title || "Untitled Viva Case";
}

function countSelection(selection: PlanSelection) {
  return {
    chapters: selection.chapterIds.length,
    videos: selection.videoIds.length,
    quizzes: selection.quizIds.length,
    mocks: selection.mockIds.length,
    vivaCases: selection.vivaCaseIds.length,
    total:
      selection.chapterIds.length +
      selection.videoIds.length +
      selection.quizIds.length +
      selection.mockIds.length +
      selection.vivaCaseIds.length,
  };
}

export async function GET() {
  try {
    const [plansSnap, chaptersSnap, videosSnap, quizzesSnap, mocksSnap, vivaSnap] = await Promise.all([
      adminDb.collection("pricingPlans").orderBy("updatedAt", "desc").get(),
      adminDb.collection("chapters").where("isActive", "==", true).get(),
      adminDb.collection("videoItems").get(),
      adminDb.collection("quizzes").where("isActive", "==", true).get(),
      adminDb.collection("mocks").get(),
      adminDb.collection("vivaCases").where("isActive", "==", true).get(),
    ]);

    const plans = plansSnap.docs.map((doc) => {
      const data = doc.data();
      const selection = normalizeSelection(data.selectedContent);

      return {
        id: doc.id,
        ...data,
        selectedContent: selection,
        contentCounts: data.contentCounts ?? countSelection(selection),
      };
    });

    const catalog = {
      chapters: chaptersSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || doc.id,
          nodeType: data.nodeType || "TEST",
          isPremium: Boolean(data.isPremium),
        };
      }),
      videos: videosSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || "Untitled Video",
          sectionId: data.sectionId || null,
          accessTier: data.accessTier || "free",
          provider: data.provider || "youtube",
        };
      }),
      quizzes: quizzesSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || doc.id,
          type: data.type || "chapter",
          durationMinutes: data.durationMinutes || 0,
        };
      }),
      mocks: mocksSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || "Untitled Mock",
          type: data.type || "mock",
          attemptsCount: Array.isArray(data.attempts)
            ? data.attempts.length
            : data.attemptsCount ?? 0,
        };
      }),
      vivaCases: vivaSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: toCaseTitle(data),
          attemptsCount: data.attemptsCount ?? 0,
        };
      }),
    };

    return NextResponse.json({ plans, catalog });
  } catch (error) {
    console.error("Pricing plans fetch error:", error);
    return NextResponse.json({ error: "Failed to load pricing plans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const tag = String(body.tag ?? "").trim();
    const price = Number(body.price ?? 0);
    const expiryMonths = Number(body.expiryMonths ?? 0);
    const selection = normalizeSelection(body.selectedContent);

    if (!name) {
      return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price must be a valid number" }, { status: 400 });
    }

    if (!Number.isFinite(expiryMonths) || expiryMonths <= 0) {
      return NextResponse.json({ error: "Expiry months must be greater than 0" }, { status: 400 });
    }

    const contentCounts = countSelection(selection);

    const docRef = await adminDb.collection("pricingPlans").add({
      name,
      description,
      tag,
      price,
      expiryMonths,
      currency: "GBP",
      isActive: body.isActive !== false,
      selectedContent: selection,
      contentCounts,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ success: true, id: docRef.id });
  } catch (error) {
    console.error("Pricing plan create error:", error);
    return NextResponse.json({ error: "Failed to create pricing plan" }, { status: 500 });
  }
}
