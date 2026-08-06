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
  versions?: PricingPlanVersion[];
  price: number;
  originalPrice?: number;
  discountedPrice?: number;
  embeddedLink?: string;
  couponId?: string;
  couponCode?: string;
  eligibleCouponIds?: string[];
  marketingCouponId?: string;
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

export type PricingPlanVersion = {
  id: string;
  months: number;
  price: number;
  originalPrice?: number;
  discountedPrice?: number;
  couponId?: string;
  couponCode?: string;
  embeddedLink?: string;
  durationLabel?: string;
  billingLabel?: string;
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

export type PricingPlanWaitlistResponse = {
  id: string;
  planId: string;
  planName: string;
  name: string;
  email: string;
  institution: string;
  createdAt?: string | null;
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
  availabilityNote: string;
  sortOrder: number;
  vivaMinutes: number;
  featureBulletsText: string;
  isActive: boolean;
  accessScopes: PlanAccessScopes;
  selectedContent: PlanSelection;
  eligibleCouponIds: string[];
  marketingCouponId: string;
  versions: PlanVersionFormValues[];
};

export type PlanVersionFormValues = {
  id: string;
  months: number;
  price: string;
  couponId: string;
  embeddedLink: string;
  durationLabel: string;
  billingLabel: string;
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
