"use client";

import {
  Brain,
  GraduationCap,
  Layers3,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import type {
  CatalogResponse,
  CouponFormValues,
  PlanAccessScopes,
  PlanFormValues,
  PlanVersionFormValues,
  PlanSelection,
} from "@/components/dashboard/plan-creator/types";

export const emptySelection: PlanSelection = {
  chapterIds: [],
  videoIds: [],
  quizIds: [],
  mockIds: [],
  vivaCaseIds: [],
};

export const emptyScopes: PlanAccessScopes = {
  courseIds: [],
  chapterGroupIds: [],
  videoSectionIds: [],
  vivaFolderIds: [],
};

export const emptyCatalog: CatalogResponse = {
  chapters: [],
  chapterGroups: [],
  courses: [],
  videoSections: [],
  videos: [],
  quizzes: [],
  mocks: [],
  vivaCases: [],
  vivaFolders: [],
};

export function createEmptyPlanVersion(
  months = 3,
  overrides: Partial<PlanVersionFormValues> = {}
): PlanVersionFormValues {
  return {
    id: overrides.id ?? `version-${months}-${Math.random().toString(36).slice(2, 9)}`,
    months,
    price: overrides.price ?? "",
    couponId: overrides.couponId ?? "",
    embeddedLink: overrides.embeddedLink ?? "",
    durationLabel: overrides.durationLabel ?? "",
    billingLabel: overrides.billingLabel ?? "",
  };
}

export const emptyForm: PlanFormValues = {
  name: "",
  description: "",
  tag: "",
  category: "",
  availabilityNote: "",
  sortOrder: 0,
  vivaMinutes: 0,
  featureBulletsText: "",
  isActive: true,
  accessScopes: emptyScopes,
  selectedContent: emptySelection,
  eligibleCouponIds: [],
  marketingCouponId: "",
  versions: [createEmptyPlanVersion(3, { price: "49" })],
};

export const emptyCouponForm: CouponFormValues = {
  code: "",
  description: "",
  discountType: "percent",
  discountValue: "10",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

export const expiryPresets = [3, 6, 9, 12];

export const featureSuggestions = [
  "Live Lectures + Viva Practice",
  "Full Recordings Access",
  "AI Viva Mock (500 minutes)",
  "AI-Based Viva Practice (500 minutes)",
  "Face-to-Face Online Mock Exam",
  "One to one live online sessions",
  "Urologics ELITE SBA",
  "Urologics ELITE Viva",
];

export const vivaMinutePresets = [0, 100, 250, 500];

export const couponTypeOptions = [
  { key: "percent", label: "Percent" },
  { key: "amount", label: "Amount" },
] as const;

export const planPatterns = [
  {
    key: "course-viva",
    title: "Course + Viva",
    icon: GraduationCap,
    description: "For CORE and ELITE style lecture-led plans.",
    values: {
      category: "FRCS Urology Section 2",
      durationLabel: "6 Months",
      availabilityNote: "",
      featureBulletsText: "Live Lectures + Viva Practice\nFull Recordings Access",
      vivaMinutes: 0,
    },
  },
  {
    key: "ai-viva",
    title: "AI Viva Pack",
    icon: Brain,
    description: "For stand-alone AI viva subscriptions.",
    values: {
      category: "FRCS Urology Section 2",
      durationLabel: "3 Months",
      availabilityNote: "",
      featureBulletsText: "AI-Based Viva Practice (500 minutes)",
      vivaMinutes: 500,
    },
  },
  {
    key: "mock-package",
    title: "Mock Package",
    icon: ShieldCheck,
    description: "For one or multiple mock exam offers.",
    values: {
      category: "FRCS Urology Section 2",
      durationLabel: "1 Mock",
      availabilityNote: "Limited slots only",
      featureBulletsText: "Face-to-Face Online Mock Exam",
      vivaMinutes: 0,
    },
  },
  {
    key: "mentorship",
    title: "Mentorship",
    icon: UsersRound,
    description: "For one-to-one executive mentoring plans.",
    values: {
      category: "FRCS Urology Section 2",
      durationLabel: "8 Sessions",
      availabilityNote: "Limited slots only",
      featureBulletsText: "One to one live online sessions",
      vivaMinutes: 0,
    },
  },
  {
    key: "combined-program",
    title: "Combined Program",
    icon: Layers3,
    description: "For Section 1 + Section 2 bundled pathways.",
    values: {
      category: "Combined Section 1 + Section 2",
      durationLabel: "6 Months",
      availabilityNote: "",
      featureBulletsText: "Urologics ELITE SBA\nUrologics ELITE Viva",
      vivaMinutes: 0,
    },
  },
] as const;
