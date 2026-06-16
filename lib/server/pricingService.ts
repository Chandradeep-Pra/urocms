import { FieldValue } from "firebase-admin/firestore";
import { adminDb } from "@/lib/firebaseAdmin";
import { frcsPricingPresets } from "@/lib/pricingPresets";

export type PlanSelection = {
  chapterIds: string[];
  videoIds: string[];
  quizIds: string[];
  mockIds: string[];
  vivaCaseIds: string[];
};

export type PlanAccessScopes = {
  courseIds: string[];
  chapterGroupIds: string[];
  videoSectionIds: string[];
  vivaFolderIds: string[];
};

export type PricingPlanVersionInput = {
  id: string;
  months: number;
  price: number;
  couponId: string;
  embeddedLink: string;
  durationLabel: string;
  billingLabel: string;
};

export type PricingPlanInput = {
  name: string;
  description: string;
  tag: string;
  availabilityNote: string;
  category: string;
  sortOrder: number;
  vivaMinutes: number;
  featureBullets: string[];
  isActive: boolean;
  selectedContent: PlanSelection;
  accessScopes: PlanAccessScopes;
  versions: PricingPlanVersionInput[];
};

export type PricingCouponInput = {
  code: string;
  description: string;
  discountType: "percent" | "amount";
  discountValue: number;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
};

export type PricingPlanWaitlistInput = {
  planId: string;
  name: string;
  email: string;
  institution: string;
};

export function normalizePlanSelection(selection: Partial<PlanSelection> | undefined): PlanSelection {
  return {
    chapterIds: Array.isArray(selection?.chapterIds) ? selection.chapterIds : [],
    videoIds: Array.isArray(selection?.videoIds) ? selection.videoIds : [],
    quizIds: Array.isArray(selection?.quizIds) ? selection.quizIds : [],
    mockIds: Array.isArray(selection?.mockIds) ? selection.mockIds : [],
    vivaCaseIds: Array.isArray(selection?.vivaCaseIds) ? selection.vivaCaseIds : [],
  };
}

export function normalizePlanAccessScopes(
  scopes: Partial<PlanAccessScopes> | undefined
): PlanAccessScopes {
  return {
    courseIds: Array.isArray(scopes?.courseIds) ? scopes.courseIds : [],
    chapterGroupIds: Array.isArray(scopes?.chapterGroupIds) ? scopes.chapterGroupIds : [],
    videoSectionIds: Array.isArray(scopes?.videoSectionIds) ? scopes.videoSectionIds : [],
    vivaFolderIds: Array.isArray(scopes?.vivaFolderIds) ? scopes.vivaFolderIds : [],
  };
}

export function countPlanSelection(selection: PlanSelection) {
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

function toCaseTitle(data: Record<string, any>) {
  return data?.case?.title || data?.title || "Untitled Viva Case";
}

function sanitizeFeatureBullets(value: unknown) {
  return Array.isArray(value)
    ? value.map((item) => String(item).trim()).filter(Boolean)
    : [];
}

function parsePricingPlanVersions(body: any): PricingPlanVersionInput[] {
  const rawVersions = Array.isArray(body?.versions) ? body.versions : [];

  return rawVersions.map((version: any, index: number) => ({
    id: String(version?.id ?? `version-${index + 1}`).trim() || `version-${index + 1}`,
    months: Number(version?.months ?? 0),
    price: Number(version?.price ?? 0),
    couponId: String(version?.couponId ?? "").trim(),
    embeddedLink: String(version?.embeddedLink ?? "").trim(),
    durationLabel: String(version?.durationLabel ?? "").trim(),
    billingLabel: String(version?.billingLabel ?? "").trim(),
  }));
}

export function parsePricingPlanInput(body: any): PricingPlanInput {
  const parsedVersions = parsePricingPlanVersions(body);
  const fallbackVersion =
    parsedVersions.length > 0
      ? parsedVersions
      : [
          {
            id: "legacy-default",
            months: Number(body?.expiryMonths ?? 0),
            price: Number(body?.price ?? 0),
            couponId: String(body?.couponId ?? "").trim(),
            embeddedLink: String(body?.embeddedLink ?? "").trim(),
            durationLabel: String(body?.durationLabel ?? "").trim(),
            billingLabel: String(body?.billingLabel ?? "").trim(),
          },
        ];

  return {
    name: String(body?.name ?? "").trim(),
    description: String(body?.description ?? "").trim(),
    tag: String(body?.tag ?? "").trim(),
    availabilityNote: String(body?.availabilityNote ?? "").trim(),
    category: String(body?.category ?? "").trim(),
    sortOrder: Number(body?.sortOrder ?? 0),
    vivaMinutes: Number(body?.vivaMinutes ?? 0),
    featureBullets: sanitizeFeatureBullets(body?.featureBullets),
    isActive: body?.isActive !== false,
    selectedContent: normalizePlanSelection(body?.selectedContent),
    accessScopes: normalizePlanAccessScopes(body?.accessScopes),
    versions: fallbackVersion,
  };
}

async function resolvePlanVersionPricing(version: PricingPlanVersionInput) {
  const originalPrice = version.price;

  if (!version.couponId) {
    return {
      id: version.id,
      months: version.months,
      price: originalPrice,
      originalPrice,
      discountedPrice: originalPrice,
      couponId: "",
      couponCode: "",
      couponDiscountType: null,
      couponDiscountValue: null,
      embeddedLink: version.embeddedLink,
      durationLabel: version.durationLabel,
      billingLabel: version.billingLabel,
    };
  }

  const couponDoc = await adminDb.collection("pricingCoupons").doc(version.couponId).get();
  if (!couponDoc.exists) {
    throw new Error("Selected coupon no longer exists");
  }

  const coupon = couponDoc.data() ?? {};
  if (coupon.isActive === false) {
    throw new Error("Selected coupon is inactive");
  }

  const discountType = coupon.discountType === "amount" ? "amount" : "percent";
  const discountValue = Number(coupon.discountValue ?? 0);

  if (!Number.isFinite(discountValue) || discountValue <= 0) {
    throw new Error("Selected coupon has an invalid discount value");
  }

  const discountedPrice =
    discountType === "percent"
      ? Math.max(
          0,
          Math.round((originalPrice - (originalPrice * discountValue) / 100) * 100) / 100
        )
      : Math.max(0, Math.round((originalPrice - discountValue) * 100) / 100);

  return {
    id: version.id,
    months: version.months,
    price: originalPrice,
    originalPrice,
    discountedPrice,
    couponId: couponDoc.id,
    couponCode: String(coupon.code || ""),
    couponDiscountType: discountType,
    couponDiscountValue: discountValue,
    embeddedLink: version.embeddedLink,
    durationLabel: version.durationLabel,
    billingLabel: version.billingLabel,
  };
}

async function resolvePlanPricing(input: PricingPlanInput) {
  const versions = await Promise.all(input.versions.map(resolvePlanVersionPricing));
  return {
    versions,
    primaryVersion: versions[0],
  };
}

export function validatePricingPlanInput(input: PricingPlanInput) {
  if (!input.name) {
    return "Plan name is required";
  }

  if (!Array.isArray(input.versions) || input.versions.length === 0) {
    return "Add at least one plan version";
  }

  for (const version of input.versions) {
    if (!Number.isFinite(version.price) || version.price < 0) {
      return "Each version must have a valid price";
    }

    if (!Number.isFinite(version.months) || version.months <= 0) {
      return "Each version must have a valid duration in months";
    }
  }

  return null;
}

export function parsePricingCouponInput(body: any): PricingCouponInput {
  return {
    code: String(body?.code ?? "").trim().toUpperCase(),
    description: String(body?.description ?? "").trim(),
    discountType: body?.discountType === "amount" ? "amount" : "percent",
    discountValue: Number(body?.discountValue ?? 0),
    startsAt: body?.startsAt ? String(body.startsAt) : null,
    endsAt: body?.endsAt ? String(body.endsAt) : null,
    isActive: body?.isActive !== false,
  };
}

export function validatePricingCouponInput(input: PricingCouponInput) {
  if (!input.code) {
    return "Coupon code is required";
  }

  if (!Number.isFinite(input.discountValue) || input.discountValue <= 0) {
    return "Discount value must be greater than 0";
  }

  return null;
}

export function parsePricingPlanWaitlistInput(body: any): PricingPlanWaitlistInput {
  return {
    planId: String(body?.planId ?? "").trim(),
    name: String(body?.name ?? "").trim(),
    email: String(body?.email ?? "").trim().toLowerCase(),
    institution: String(body?.institution ?? "").trim(),
  };
}

export function validatePricingPlanWaitlistInput(input: PricingPlanWaitlistInput) {
  if (!input.planId) {
    return "Plan is required";
  }

  if (!input.name || !input.email || !input.institution) {
    return "Name, email, and institution are required";
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
    return "Enter a valid email address";
  }

  return null;
}

function serializeDate(value: any) {
  if (value?.toDate) {
    return value.toDate().toISOString();
  }

  return typeof value === "string" ? value : null;
}

export async function loadPricingAdminData() {
  const [
    plansSnap,
    couponsSnap,
    waitlistSnap,
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
    adminDb.collection("pricingPlanWaitlist").orderBy("createdAt", "desc").limit(100).get(),
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
    const selectedContent = normalizePlanSelection(data.selectedContent);
    const accessScopes = normalizePlanAccessScopes(data.accessScopes);

    return {
      id: doc.id,
      ...data,
      selectedContent,
      accessScopes,
      contentCounts: data.contentCounts ?? countPlanSelection(selectedContent),
      category: data.category ?? "",
      durationLabel: data.durationLabel ?? "",
      billingLabel: data.billingLabel ?? "",
      availabilityNote: data.availabilityNote ?? "",
      featureBullets: sanitizeFeatureBullets(data.featureBullets),
      sortOrder: Number(data.sortOrder ?? 0),
      vivaMinutes: Number(data.vivaMinutes ?? 0),
      embeddedLink: String(data.embeddedLink ?? ""),
      couponId: String(data.couponId ?? ""),
      couponCode: String(data.couponCode ?? ""),
      originalPrice: Number(data.originalPrice ?? data.price ?? 0),
      discountedPrice: Number(data.discountedPrice ?? data.price ?? 0),
      versions: Array.isArray(data.versions)
        ? data.versions.map((version: any, index: number) => ({
            id: String(version?.id ?? `version-${index + 1}`),
            months: Number(version?.months ?? 0),
            price: Number(version?.price ?? version?.originalPrice ?? 0),
            originalPrice: Number(
              version?.originalPrice ?? version?.price ?? data.originalPrice ?? data.price ?? 0
            ),
            discountedPrice: Number(
              version?.discountedPrice ?? version?.price ?? data.discountedPrice ?? data.price ?? 0
            ),
            couponId: String(version?.couponId ?? ""),
            couponCode: String(version?.couponCode ?? ""),
            embeddedLink: String(version?.embeddedLink ?? ""),
            durationLabel: String(version?.durationLabel ?? ""),
            billingLabel: String(version?.billingLabel ?? ""),
          }))
        : [
            {
              id: "legacy-default",
              months: Number(data.expiryMonths ?? 0),
              price: Number(data.price ?? 0),
              originalPrice: Number(data.originalPrice ?? data.price ?? 0),
              discountedPrice: Number(data.discountedPrice ?? data.price ?? 0),
              couponId: String(data.couponId ?? ""),
              couponCode: String(data.couponCode ?? ""),
              embeddedLink: String(data.embeddedLink ?? ""),
              durationLabel: String(data.durationLabel ?? ""),
              billingLabel: String(data.billingLabel ?? ""),
            },
          ],
    };
  });

  const coupons = couponsSnap.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  const waitlistResponses = waitlistSnap.docs.map((doc) => {
    const data = doc.data();

    return {
      id: doc.id,
      planId: String(data.planId ?? ""),
      planName: String(data.planName ?? "Unknown plan"),
      name: String(data.name ?? ""),
      email: String(data.email ?? ""),
      institution: String(data.institution ?? ""),
      createdAt: serializeDate(data.createdAt),
    };
  });

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

  return { plans, coupons, catalog, waitlistResponses };
}

export async function createPricingPlanWaitlistEntry(input: PricingPlanWaitlistInput) {
  const planDoc = await adminDb.collection("pricingPlans").doc(input.planId).get();

  if (!planDoc.exists) {
    throw new Error("Plan not found");
  }

  const plan = planDoc.data() ?? {};

  if (plan.isActive !== false) {
    throw new Error("Waitlist is only available for coming soon plans");
  }

  const docRef = await adminDb.collection("pricingPlanWaitlist").add({
    planId: planDoc.id,
    planName: String(plan.name ?? "Untitled Plan"),
    name: input.name,
    email: input.email,
    institution: input.institution,
    source: "pricing-page",
    createdAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

export async function createPricingPlan(input: PricingPlanInput) {
  const pricing = await resolvePlanPricing(input);
  const primaryVersion = pricing.primaryVersion;

  const docRef = await adminDb.collection("pricingPlans").add({
    name: input.name,
    description: input.description,
    tag: input.tag,
    price: primaryVersion.price,
    originalPrice: primaryVersion.originalPrice,
    discountedPrice: primaryVersion.discountedPrice,
    embeddedLink: primaryVersion.embeddedLink,
    couponId: primaryVersion.couponId,
    couponCode: primaryVersion.couponCode,
    couponDiscountType: primaryVersion.couponDiscountType,
    couponDiscountValue: primaryVersion.couponDiscountValue,
    expiryMonths:
      Number.isFinite(primaryVersion.months) && primaryVersion.months > 0
        ? primaryVersion.months
        : 0,
    durationLabel: primaryVersion.durationLabel,
    billingLabel: primaryVersion.billingLabel,
    availabilityNote: input.availabilityNote,
    category: input.category,
    sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    vivaMinutes: Number.isFinite(input.vivaMinutes) && input.vivaMinutes > 0 ? input.vivaMinutes : 0,
    featureBullets: input.featureBullets,
    versions: pricing.versions,
    currency: "GBP",
    isActive: input.isActive,
    selectedContent: input.selectedContent,
    accessScopes: input.accessScopes,
    contentCounts: countPlanSelection(input.selectedContent),
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

export async function updatePricingPlan(id: string, input: PricingPlanInput) {
  const pricing = await resolvePlanPricing(input);
  const primaryVersion = pricing.primaryVersion;

  await adminDb.collection("pricingPlans").doc(id).update({
    name: input.name,
    description: input.description,
    tag: input.tag,
    price: primaryVersion.price,
    originalPrice: primaryVersion.originalPrice,
    discountedPrice: primaryVersion.discountedPrice,
    embeddedLink: primaryVersion.embeddedLink,
    couponId: primaryVersion.couponId,
    couponCode: primaryVersion.couponCode,
    couponDiscountType: primaryVersion.couponDiscountType,
    couponDiscountValue: primaryVersion.couponDiscountValue,
    expiryMonths:
      Number.isFinite(primaryVersion.months) && primaryVersion.months > 0
        ? primaryVersion.months
        : 0,
    durationLabel: primaryVersion.durationLabel,
    billingLabel: primaryVersion.billingLabel,
    availabilityNote: input.availabilityNote,
    category: input.category,
    sortOrder: Number.isFinite(input.sortOrder) ? input.sortOrder : 0,
    vivaMinutes: Number.isFinite(input.vivaMinutes) && input.vivaMinutes > 0 ? input.vivaMinutes : 0,
    featureBullets: input.featureBullets,
    versions: pricing.versions,
    currency: "GBP",
    isActive: input.isActive,
    selectedContent: input.selectedContent,
    accessScopes: input.accessScopes,
    contentCounts: countPlanSelection(input.selectedContent),
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deletePricingPlan(id: string) {
  await adminDb.collection("pricingPlans").doc(id).delete();
}

export async function importPricingPresets() {
  const batch = adminDb.batch();

  for (const preset of frcsPricingPresets) {
    const existing = await adminDb
      .collection("pricingPlans")
      .where("presetKey", "==", preset.presetKey)
      .limit(1)
      .get();

    const ref = existing.empty ? adminDb.collection("pricingPlans").doc() : existing.docs[0].ref;

    batch.set(
      ref,
      {
        presetKey: preset.presetKey,
        name: preset.name,
        category: preset.category,
        description: preset.description,
        tag: preset.tag ?? "",
        price: preset.price,
        expiryMonths: preset.expiryMonths,
        durationLabel: preset.durationLabel ?? "",
        billingLabel: preset.billingLabel ?? "",
        versions: [
          {
            id: `${preset.presetKey}-default`,
            months: preset.expiryMonths,
            price: preset.price,
            originalPrice: preset.price,
            discountedPrice: preset.price,
            couponId: "",
            couponCode: "",
            embeddedLink: "",
            durationLabel: preset.durationLabel ?? "",
            billingLabel: preset.billingLabel ?? "",
          },
        ],
        availabilityNote: preset.availabilityNote ?? "",
        featureBullets: preset.featureBullets,
        sortOrder: preset.sortOrder,
        currency: "GBP",
        isActive: true,
        selectedContent: normalizePlanSelection(undefined),
        accessScopes: normalizePlanAccessScopes(undefined),
        contentCounts: countPlanSelection(normalizePlanSelection(undefined)),
        vivaMinutes: preset.vivaMinutes ?? 0,
        updatedAt: FieldValue.serverTimestamp(),
        ...(existing.empty ? { createdAt: FieldValue.serverTimestamp() } : {}),
      },
      { merge: true }
    );
  }

  await batch.commit();

  return { imported: frcsPricingPresets.length };
}

export async function createPricingCoupon(input: PricingCouponInput) {
  const existing = await adminDb
    .collection("pricingCoupons")
    .where("code", "==", input.code)
    .limit(1)
    .get();

  if (!existing.empty) {
    throw new Error("Coupon code already exists");
  }

  const docRef = await adminDb.collection("pricingCoupons").add({
    code: input.code,
    description: input.description,
    discountType: input.discountType,
    discountValue: input.discountValue,
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    isActive: input.isActive,
    createdAt: FieldValue.serverTimestamp(),
    updatedAt: FieldValue.serverTimestamp(),
  });

  return docRef.id;
}

export async function updatePricingCouponStatus(id: string, isActive: boolean) {
  await adminDb.collection("pricingCoupons").doc(id).update({
    isActive,
    updatedAt: FieldValue.serverTimestamp(),
  });
}

export async function deletePricingCoupon(id: string) {
  await adminDb.collection("pricingCoupons").doc(id).delete();
}
