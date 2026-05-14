"use client";

export type CatalogItem = {
  id: string;
  title: string;
  type?: string;
  nodeType?: string;
  isPremium?: boolean;
  attemptsCount?: number;
  durationMinutes?: number;
  accessTier?: "free" | "paid" | "members-only";
  parentId?: string | null;
  showOnApp?: boolean;
  sectionsCount?: number;
};

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

export type PricingPlan = {
  id: string;
  name: string;
  description: string;
  tag?: string;
  category?: string;
  price: number;
  expiryMonths: number;
  durationLabel?: string;
  billingLabel?: string;
  availabilityNote?: string;
  featureBullets?: string[];
  sortOrder?: number;
  vivaMinutes?: number;
  currency: "GBP";
  isActive: boolean;
  selectedContent: PlanSelection;
  accessScopes?: PlanAccessScopes;
  contentCounts?: {
    chapters: number;
    videos: number;
    quizzes: number;
    mocks: number;
    vivaCases: number;
    total: number;
  };
};

export type PricingCoupon = {
  id: string;
  code: string;
  description?: string;
  discountType: "percent" | "amount";
  discountValue: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
};

export type CatalogResponse = {
  courses: CatalogItem[];
  chapters: CatalogItem[];
  chapterGroups: CatalogItem[];
  videoSections: CatalogItem[];
  videos: CatalogItem[];
  quizzes: CatalogItem[];
  mocks: CatalogItem[];
  vivaCases: CatalogItem[];
  vivaFolders: CatalogItem[];
};

export type PlanFormValues = {
  name: string;
  description: string;
  tag: string;
  category: string;
  price: string;
  expiryMonths: number;
  durationLabel: string;
  billingLabel: string;
  availabilityNote: string;
  sortOrder: number;
  vivaMinutes: number;
  featureBulletsText: string;
  isActive: boolean;
  accessScopes: PlanAccessScopes;
  selectedContent: PlanSelection;
};

export type CouponFormValues = {
  code: string;
  description: string;
  discountType: "percent" | "amount";
  discountValue: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
};
