import { adminDb } from "@/lib/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";
import { NextRequest, NextResponse } from "next/server";
import { requireAdminSession } from "@/lib/server/adminAccess";

type PlanSelection = {
  chapterIds: string[];
  videoIds: string[];
  quizIds: string[];
  mockIds: string[];
  vivaCaseIds: string[];
};

type PlanAccessScopes = {
  courseIds: string[];
  chapterGroupIds: string[];
  videoSectionIds: string[];
  vivaFolderIds: string[];
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

function normalizeAccessScopes(scopes: Partial<PlanAccessScopes> | undefined): PlanAccessScopes {
  return {
    courseIds: Array.isArray(scopes?.courseIds) ? scopes.courseIds : [],
    chapterGroupIds: Array.isArray(scopes?.chapterGroupIds) ? scopes.chapterGroupIds : [],
    videoSectionIds: Array.isArray(scopes?.videoSectionIds) ? scopes.videoSectionIds : [],
    vivaFolderIds: Array.isArray(scopes?.vivaFolderIds) ? scopes.vivaFolderIds : [],
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
    const [
      plansSnap,
      couponsSnap,
      coursesSnap,
      chaptersSnap,
      videoSectionsSnap,
      videosSnap,
      quizzesSnap,
      mocksSnap,
      vivaSnap,
      vivaFoldersSnap,
    ] = await Promise.all([
      adminDb.collection("pricingPlans").orderBy("updatedAt", "desc").get(),
      adminDb.collection("pricingCoupons").orderBy("updatedAt", "desc").get(),
      adminDb.collection("courses").orderBy("createdAt", "asc").get(),
      adminDb.collection("chapters").where("isActive", "==", true).get(),
      adminDb.collection("videoSections").get(),
      adminDb.collection("videoItems").get(),
      adminDb.collection("quizzes").where("isActive", "==", true).get(),
      adminDb.collection("mocks").get(),
      adminDb.collection("vivaCases").where("isActive", "==", true).get(),
      adminDb.collection("vivaFolders").get(),
    ]);

    const plans = plansSnap.docs.map((doc) => {
      const data = doc.data();
      const selection = normalizeSelection(data.selectedContent);
      const accessScopes = normalizeAccessScopes(data.accessScopes);

      return {
        id: doc.id,
        ...data,
        selectedContent: selection,
        accessScopes,
        contentCounts: data.contentCounts ?? countSelection(selection),
        category: data.category ?? "",
        durationLabel: data.durationLabel ?? "",
        billingLabel: data.billingLabel ?? "",
        availabilityNote: data.availabilityNote ?? "",
        featureBullets: Array.isArray(data.featureBullets) ? data.featureBullets : [],
        sortOrder: Number(data.sortOrder ?? 0),
        vivaMinutes: Number(data.vivaMinutes ?? 0),
      };
    });

    const coupons = couponsSnap.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    const catalog = {
      courses: coursesSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: String(data.title || "Untitled Course"),
          accessTier: data.accessTier || "free",
          showOnApp: Boolean(data.showOnApp),
          sectionsCount: Array.isArray(data.sections) ? data.sections.length : 0,
        };
      }),
      chapters: chaptersSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || doc.id,
          nodeType: data.nodeType || "TEST",
          isPremium: Boolean(data.isPremium),
        };
      }),
      chapterGroups: chaptersSnap.docs
        .map((doc) => ({
          id: doc.id,
          title: String(doc.data().title || doc.id),
          nodeType: String(doc.data().nodeType || "TEST"),
          parentId: doc.data().parentId || null,
        }))
        .filter((item) => item.nodeType === "GROUP"),
      videoSections: videoSectionsSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: data.title || "Untitled Section",
          accessTier: data.accessTier || "free",
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
      vivaFolders: vivaFoldersSnap.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          title: String(data.title || "Untitled Folder"),
          description: String(data.description || ""),
        };
      }),
    };

    return NextResponse.json({ plans, coupons, catalog });
  } catch (error) {
    console.error("Pricing plans fetch error:", error);
    return NextResponse.json({ error: "Failed to load pricing plans" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { response } = await requireAdminSession(req);
  if (response) return response;

  try {
    const body = await req.json();
    const name = String(body.name ?? "").trim();
    const description = String(body.description ?? "").trim();
    const tag = String(body.tag ?? "").trim();
    const price = Number(body.price ?? 0);
    const expiryMonths = Number(body.expiryMonths ?? 0);
    const durationLabel = String(body.durationLabel ?? "").trim();
    const billingLabel = String(body.billingLabel ?? "").trim();
    const availabilityNote = String(body.availabilityNote ?? "").trim();
    const category = String(body.category ?? "").trim();
    const sortOrder = Number(body.sortOrder ?? 0);
    const vivaMinutes = Number(body.vivaMinutes ?? 0);
    const featureBullets = Array.isArray(body.featureBullets)
      ? body.featureBullets.map((item: unknown) => String(item).trim()).filter(Boolean)
      : [];
    const selection = normalizeSelection(body.selectedContent);
    const accessScopes = normalizeAccessScopes(body.accessScopes);

    if (!name) {
      return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
    }

    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ error: "Price must be a valid number" }, { status: 400 });
    }

    if ((!Number.isFinite(expiryMonths) || expiryMonths <= 0) && !durationLabel) {
      return NextResponse.json(
        { error: "Add a valid expiry in months or a custom duration label" },
        { status: 400 }
      );
    }

    const contentCounts = countSelection(selection);

    const docRef = await adminDb.collection("pricingPlans").add({
      name,
      description,
      tag,
      price,
      expiryMonths: Number.isFinite(expiryMonths) && expiryMonths > 0 ? expiryMonths : 0,
      durationLabel,
      billingLabel,
      availabilityNote,
      category,
      sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
      vivaMinutes: Number.isFinite(vivaMinutes) && vivaMinutes > 0 ? vivaMinutes : 0,
      featureBullets,
      currency: "GBP",
      isActive: body.isActive !== false,
      selectedContent: selection,
      accessScopes,
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
