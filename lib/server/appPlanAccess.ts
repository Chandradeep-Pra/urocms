import { adminDb } from "@/lib/firebaseAdmin";
import { type AppTier } from "@/lib/appAccess";
import {
  normalizePlanAccessScopes,
  normalizePlanSelection,
  type PlanAccessScopes,
  type PlanSelection,
} from "@/lib/server/pricingService";

export type AppPlanStatus = "active" | "expired" | "none";

export type AppPlanEntitlements = {
  chapters: string[];
  videos: string[];
  quizzes: string[];
  mocks: string[];
  vivaCases: string[];
  courses: string[];
  chapterGroups: string[];
  videoSections: string[];
  vivaFolders: string[];
};

export type ResolvedAppPlan = {
  id: string;
  name: string;
  expiryMonths: number;
  vivaMinutes?: number;
  selectedContent: PlanSelection;
  accessScopes: PlanAccessScopes;
};

export type AppPlanAccessSnapshot = {
  activePlanId: string | null;
  activePlanStatus: AppPlanStatus;
  planActivatedAt: string | null;
  planExpiresAt: string | null;
  plan: ResolvedAppPlan | null;
  entitlements: AppPlanEntitlements;
};

export type AppPlanUserInput = {
  uid: string;
  tier: AppTier;
  activePlanId?: string | null;
  activePlanStatus?: AppPlanStatus | string | null;
  planActivatedAt?: unknown;
  planExpiresAt?: unknown;
};

export const emptyEntitlements = (): AppPlanEntitlements => ({
  chapters: [],
  videos: [],
  quizzes: [],
  mocks: [],
  vivaCases: [],
  courses: [],
  chapterGroups: [],
  videoSections: [],
  vivaFolders: [],
});

function normalizeIdList(values: string[]) {
  return Array.from(new Set(values.map((value) => String(value).trim()).filter(Boolean)));
}

function normalizePlanStatus(value: unknown): AppPlanStatus {
  return value === "active" || value === "expired" || value === "none" ? value : "none";
}

function toIsoString(value: unknown): string | null {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (value instanceof Date) return value.toISOString();

  const timestamp = value as { toDate?: () => Date };
  if (typeof timestamp.toDate === "function") {
    return timestamp.toDate().toISOString();
  }

  return null;
}

function isExpired(expiresAt: string | null) {
  if (!expiresAt) return false;

  const timestamp = Date.parse(expiresAt);
  return Number.isFinite(timestamp) && timestamp <= Date.now();
}

function buildEntitlements(selection: PlanSelection, scopes: PlanAccessScopes): AppPlanEntitlements {
  return {
    chapters: normalizeIdList(selection.chapterIds),
    videos: normalizeIdList(selection.videoIds),
    quizzes: normalizeIdList(selection.quizIds),
    mocks: normalizeIdList(selection.mockIds),
    vivaCases: normalizeIdList(selection.vivaCaseIds),
    courses: normalizeIdList(scopes.courseIds),
    chapterGroups: normalizeIdList(scopes.chapterGroupIds),
    videoSections: normalizeIdList(scopes.videoSectionIds),
    vivaFolders: normalizeIdList(scopes.vivaFolderIds),
  };
}

export async function resolveAppPlanAccess(user: AppPlanUserInput): Promise<AppPlanAccessSnapshot> {
  const activePlanId = user.activePlanId ? String(user.activePlanId).trim() : "";
  const planActivatedAt = toIsoString(user.planActivatedAt);
  const planExpiresAt = toIsoString(user.planExpiresAt);
  const userPlanStatus = normalizePlanStatus(user.activePlanStatus);

  if (!activePlanId) {
    return {
      activePlanId: null,
      activePlanStatus: "none",
      planActivatedAt,
      planExpiresAt,
      plan: null,
      entitlements: emptyEntitlements(),
    };
  }

  if (userPlanStatus === "expired" || isExpired(planExpiresAt)) {
    return {
      activePlanId,
      activePlanStatus: "expired",
      planActivatedAt,
      planExpiresAt,
      plan: null,
      entitlements: emptyEntitlements(),
    };
  }

  const planDoc = await adminDb.collection("pricingPlans").doc(activePlanId).get();
  if (!planDoc.exists) {
    return {
      activePlanId,
      activePlanStatus: "none",
      planActivatedAt,
      planExpiresAt,
      plan: null,
      entitlements: emptyEntitlements(),
    };
  }

  const data = planDoc.data() ?? {};
  if (data.isActive === false) {
    return {
      activePlanId,
      activePlanStatus: "none",
      planActivatedAt,
      planExpiresAt,
      plan: null,
      entitlements: emptyEntitlements(),
    };
  }

  const selectedContent = normalizePlanSelection(data.selectedContent);
  const accessScopes = normalizePlanAccessScopes(data.accessScopes);

  return {
    activePlanId,
    activePlanStatus: "active",
    planActivatedAt,
    planExpiresAt,
    plan: {
      id: planDoc.id,
      name: String(data.name ?? "Assigned plan"),
      expiryMonths: Number(data.expiryMonths ?? 0),
      vivaMinutes:
        typeof data.vivaMinutes === "number" ? data.vivaMinutes : Number(data.vivaMinutes ?? 0),
      selectedContent,
      accessScopes,
    },
    entitlements: buildEntitlements(selectedContent, accessScopes),
  };
}
