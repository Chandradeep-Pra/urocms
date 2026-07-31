export type AppTier = "guest" | "free" | "paid";
export type QuizType = "chapter" | "mock" | "grand-mock" | string;

export type ModuleAccessState = "action" | "locked" | "preview" | "full";

export interface AccessModule {
  key: string;
  label: string;
  description: string;
  state: ModuleAccessState;
}

export const FREE_CHAPTER_PREVIEW_LIMIT = 4;
export const FREE_AI_VIVA_MINUTES = 10;

export function isPaidTier(tier: AppTier) {
  return tier === "paid";
}

export function getMockAccess(tier: AppTier) {
  if (tier === "paid") {
    return {
      allowed: true,
      mode: "full" as const,
      previewLimit: null,
    };
  }

  return {
    allowed: false,
    mode: "locked" as const,
    previewLimit: null,
    requiredTier: tier === "guest" ? ("free" as const) : ("paid" as const),
    reason:
      tier === "guest"
        ? "Complete your profile to unlock the free starter access."
        : "Mocks and grand mocks unlock through a paid plan or course assignment.",
  };
}

export function canAccessMocks(tier: AppTier) {
  return tier === "paid";
}

export function canAccessViva(tier: AppTier) {
  return tier === "free" || tier === "paid";
}

function normalizeQuizType(quizType: QuizType) {
  return String(quizType ?? "").trim().toLowerCase().replace(/[_\s]+/g, "-");
}

function isPreviewableQuizType(quizType: QuizType) {
  const normalized = normalizeQuizType(quizType);

  return (
    normalized === "chapter" ||
    normalized === "quiz" ||
    normalized === "chapter-quiz" ||
    normalized === "chapter-wise" ||
    normalized === "chapter-wise-test" ||
    normalized === "chapterwise" ||
    normalized.includes("chapter")
  );
}

export function getQuizAccess(tier: AppTier, quizType: QuizType) {
  const normalizedQuizType = normalizeQuizType(quizType);

  if (normalizedQuizType === "mock" || normalizedQuizType === "grand-mock") {
    if (tier === "paid") {
      return {
        allowed: true,
        mode: "full" as const,
        previewLimit: null,
      };
    }

    return {
      allowed: false,
      mode: "locked" as const,
      previewLimit: null,
      requiredTier: tier === "guest" ? ("free" as const) : ("paid" as const),
      reason:
        tier === "guest"
          ? "Complete your profile to unlock chapter quiz previews."
          : "Mocks and grand mocks unlock through a paid plan or course assignment.",
    };
  }

  if (!isPreviewableQuizType(quizType)) {
    return {
      allowed: false,
      mode: "locked" as const,
      previewLimit: null,
      requiredTier: tier === "guest" ? ("free" as const) : ("paid" as const),
      reason:
        tier === "guest"
          ? "Complete your profile to unlock the free chapter quiz preview."
          : "This quiz is locked until it is included in your active plan.",
    };
  }

  if (tier === "paid") {
    return {
      allowed: true,
      mode: "full" as const,
      previewLimit: null,
    };
  }

  if (tier === "guest") {
    return {
      allowed: false,
      mode: "locked" as const,
      previewLimit: null,
      requiredTier: "free" as const,
      reason: "Complete your profile to unlock the free chapter quiz preview.",
    };
  }

  return {
    allowed: true,
    mode: "preview" as const,
    previewLimit: FREE_CHAPTER_PREVIEW_LIMIT,
    requiredTier: null,
    reason: `Preview mode: first ${FREE_CHAPTER_PREVIEW_LIMIT} questions only.`,
  };
}

export const APP_TIER_FLOW: Array<{
  tier: AppTier;
  label: string;
  subtitle: string;
}> = [
  {
    tier: "guest",
    label: "Guest",
    subtitle: "Fresh sign-in state before profile completion.",
  },
  {
    tier: "free",
    label: "Free",
    subtitle: "Completed profile with chapter quiz preview access.",
  },
  {
    tier: "paid",
    label: "Paid",
    subtitle: "Unlocked learning experience after payment.",
  },
];

export function getTierHeadline(tier: AppTier) {
  switch (tier) {
    case "guest":
      return {
        title: "Guest users should be guided into profile completion.",
        description:
          "This state is best used as a short onboarding bridge before the learner becomes a free user.",
      };
    case "free":
      return {
        title: "Free users get chapter quiz previews plus a short AI viva starter credit.",
        description: `Unlock ${FREE_CHAPTER_PREVIEW_LIMIT} chapter quiz questions per chapter, keep mocks locked, and grant ${FREE_AI_VIVA_MINUTES} AI viva minutes.`,
      };
    case "paid":
      return {
        title: "Paid users see the full exam-prep experience.",
        description:
          "Chapter quizzes, mocks, grand mocks, and AI viva all become available after upgrade.",
      };
  }
}

export function getTierModules(tier: AppTier): AccessModule[] {
  if (tier === "guest") {
    return [
      {
        key: "profile",
        label: "Complete Profile",
        description: "Required next step before free access begins.",
        state: "action",
      },
      {
        key: "chapter-quizzes",
        label: "Chapter Quizzes",
        description: "Locked until profile completion.",
        state: "locked",
      },
      {
        key: "mock-tests",
        label: "Mock Tests",
        description: "Locked until a paid plan or course grant is added.",
        state: "locked",
      },
      {
        key: "grand-mocks",
        label: "Grand Mocks",
        description: "Locked until a paid plan or course grant is added.",
        state: "locked",
      },
      {
        key: "ai-viva",
        label: "AI Viva",
        description: "Locked until profile completion.",
        state: "locked",
      },
    ];
  }

  if (tier === "free") {
    return [
      {
        key: "profile",
        label: "Profile",
        description: "Completed. User is now in the free tier.",
        state: "full",
      },
      {
        key: "chapter-quizzes",
        label: "Chapter Quizzes",
        description: `${FREE_CHAPTER_PREVIEW_LIMIT} question preview per chapter quiz.`,
        state: "preview",
      },
      {
        key: "mock-tests",
        label: "Mock Tests",
        description: "Locked until a paid plan or course grant is added.",
        state: "locked",
      },
      {
        key: "grand-mocks",
        label: "Grand Mocks",
        description: "Locked until a paid plan or course grant is added.",
        state: "locked",
      },
      {
        key: "ai-viva",
        label: "AI Viva",
        description: `${FREE_AI_VIVA_MINUTES} free starter minutes after profile completion.`,
        state: "preview",
      },
    ];
  }

  return [
    {
      key: "profile",
      label: "Profile",
      description: "Completed with paid access attached to the account.",
      state: "full",
    },
    {
      key: "chapter-quizzes",
      label: "Chapter Quizzes",
      description: "Full chapter quiz access.",
      state: "full",
    },
    {
      key: "mock-tests",
      label: "Mock Tests",
      description: "Unlocked.",
      state: "full",
    },
    {
      key: "grand-mocks",
      label: "Grand Mocks",
      description: "Unlocked.",
      state: "full",
    },
    {
      key: "ai-viva",
      label: "AI Viva",
      description: "Unlocked.",
      state: "full",
    },
  ];
}
