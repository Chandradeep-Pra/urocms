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
export const FREE_WEEKLY_MOCK_PREVIEW_LIMIT = 3;

export function isPaidTier(tier: AppTier) {
  return tier === "paid";
}

export function getMockAccess(tier: AppTier) {
  if (tier === "paid") {
    return {
      allowed: true,
      mode: "full" as const,
      weeklyQuestionLimit: null,
    };
  }

  if (tier === "free") {
    return {
      allowed: true,
      mode: "preview" as const,
      weeklyQuestionLimit: FREE_WEEKLY_MOCK_PREVIEW_LIMIT,
    };
  }

  return {
    allowed: false,
    mode: "locked" as const,
    weeklyQuestionLimit: null,
    requiredTier: "free" as const,
    reason: "Complete profile first to unlock the free mock preview.",
  };
}

export function canAccessMocks(tier: AppTier) {
  return getMockAccess(tier).allowed;
}

export function canAccessViva(tier: AppTier) {
  return isPaidTier(tier);
}

export function getQuizAccess(tier: AppTier, quizType: QuizType) {
  if (quizType === "mock" || quizType === "grand-mock") {
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
      requiredTier: "paid" as const,
      reason: "Mocks and grand mocks are available only for paid users.",
    };
  }

  if (tier === "paid") {
    return {
      allowed: true,
      mode: "full" as const,
      previewLimit: null,
    };
  }

  if (tier === "free") {
    return {
      allowed: true,
      mode: "preview" as const,
      previewLimit: FREE_CHAPTER_PREVIEW_LIMIT,
    };
  }

  return {
    allowed: false,
    mode: "locked" as const,
    previewLimit: null,
    requiredTier: "free" as const,
    reason: "Complete profile first to unlock the free chapter quiz preview.",
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
        title: "Free users get a chapter quiz preview only.",
        description: `Unlock ${FREE_CHAPTER_PREVIEW_LIMIT} chapter quiz questions per chapter and keep mocks plus AI viva locked.`,
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
        description: "Locked until profile completion upgrades the user to free.",
        state: "locked",
      },
      {
        key: "mock-tests",
        label: "Mock Tests",
        description: "Premium exam practice stays locked.",
        state: "locked",
      },
      {
        key: "grand-mocks",
        label: "Grand Mocks",
        description: "Locked until paid upgrade.",
        state: "locked",
      },
      {
        key: "ai-viva",
        label: "AI Viva",
        description: "Locked until paid upgrade.",
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
        description: `${FREE_WEEKLY_MOCK_PREVIEW_LIMIT} mock questions per week across mocks and grand mocks.`,
        state: "preview",
      },
      {
        key: "grand-mocks",
        label: "Grand Mocks",
        description: "Locked for free users.",
        state: "locked",
      },
      {
        key: "ai-viva",
        label: "AI Viva",
        description: "Locked for free users.",
        state: "locked",
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
