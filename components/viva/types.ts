export type VivaMode = "Calm and Composed" | "Fast and Furious";

export interface Attempt {
  candidate: {
    name: string;
    email: string;
  };
  report?: {
    score?: number;
  };
}

export interface VivaExhibit {
  id: string;
  label: string;
  url: string;
  description: string;
}

export interface FastQuestionConfig {
  id: string;
  question: string;
  answerKeywords: string[];
  linkedExhibitIds: string[];
}

export interface VivaCase {
  id: string;
  case: {
    title: string;
    level: string;
    stem: string;
    objectives: string[];
  };
  exhibits: VivaExhibit[];
  marking_criteria: {
    must_mention: string[];
    critical_fail: string[];
  };
  allowedUser: string[];
  modes: {
    calmAndComposed: {
      enabled: boolean;
    };
    fastAndFurious: {
      enabled: boolean;
      questionCount: number;
      questions: FastQuestionConfig[];
    };
  };
  attemptsCount?: number;
  attempts?: Attempt[];
  isActive?: boolean;
}

export type VivaCaseForm = Omit<VivaCase, "id" | "attemptsCount" | "attempts">;

const createId = (prefix: string) =>
  `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

export const createExhibit = (): VivaExhibit => ({
  id: createId("exhibit"),
  label: "",
  url: "",
  description: "",
});

export const createFastQuestion = (): FastQuestionConfig => ({
  id: createId("question"),
  question: "",
  answerKeywords: [],
  linkedExhibitIds: [],
});

export const createInitialVivaForm = (): VivaCaseForm => ({
  case: {
    title: "",
    level: "Intermediate",
    stem: "",
    objectives: [],
  },
  exhibits: [],
  marking_criteria: {
    must_mention: [],
    critical_fail: [],
  },
  allowedUser: [],
  modes: {
    calmAndComposed: {
      enabled: true,
    },
    fastAndFurious: {
      enabled: false,
      questionCount: 3,
      questions: [createFastQuestion(), createFastQuestion(), createFastQuestion()],
    },
  },
  isActive: true,
});

const normalizeExhibits = (exhibits: unknown): VivaExhibit[] => {
  if (!Array.isArray(exhibits)) return [];

  return exhibits.map((item) => {
    const exhibit = item as Partial<VivaExhibit>;

    return {
      id: exhibit.id || createId("exhibit"),
      label: exhibit.label || "",
      url: exhibit.url || "",
      description: exhibit.description || "",
    };
  });
};

const normalizeFastQuestions = (
  rawQuestions: unknown,
  exhibits: VivaExhibit[]
): FastQuestionConfig[] => {
  if (!Array.isArray(rawQuestions)) return [];

  return rawQuestions.map((item) => {
    if (item && typeof item === "object" && "id" in (item as object)) {
      const question = item as Partial<FastQuestionConfig>;

      return {
        id: question.id || createId("question"),
        question: question.question || "",
        answerKeywords: Array.isArray(question.answerKeywords)
          ? question.answerKeywords.filter((keyword): keyword is string => !!keyword?.trim())
          : [],
        linkedExhibitIds: Array.isArray(question.linkedExhibitIds)
          ? question.linkedExhibitIds.filter((id): id is string =>
              exhibits.some((exhibit) => exhibit.id === id)
            )
          : [],
      };
    }

    const legacyQuestion = item as Record<
      string,
      {
        question?: string;
      }
    >;
    const questionKey = Object.keys(legacyQuestion || {})[0];
    const questionData = questionKey ? legacyQuestion[questionKey] : undefined;

    return {
      id: createId("question"),
      question: questionData?.question || "",
      answerKeywords: [],
      linkedExhibitIds: [],
    };
  });
};

export const normalizeVivaCase = (rawCase: any): VivaCase => {
  const exhibits = normalizeExhibits(rawCase?.exhibits);
  const legacyFastQuestions = rawCase?.case?.fastAndFuriousQuestions;
  const normalizedFastQuestions = normalizeFastQuestions(
    rawCase?.modes?.fastAndFurious?.questions ?? legacyFastQuestions,
    exhibits
  );

  const fastEnabled =
    typeof rawCase?.modes?.fastAndFurious?.enabled === "boolean"
      ? rawCase.modes.fastAndFurious.enabled
      : rawCase?.mode === "Fast and Furious" || normalizedFastQuestions.length > 0;

  const calmEnabled =
    typeof rawCase?.modes?.calmAndComposed?.enabled === "boolean"
      ? rawCase.modes.calmAndComposed.enabled
      : rawCase?.mode !== "Fast and Furious";

  return {
    id: rawCase?.id || createId("case"),
    case: {
      title: rawCase?.case?.title || "",
      level: rawCase?.case?.level || "Intermediate",
      stem: rawCase?.case?.stem || "",
      objectives: Array.isArray(rawCase?.case?.objectives)
        ? rawCase.case.objectives
        : [],
    },
    exhibits,
    marking_criteria: {
      must_mention: Array.isArray(rawCase?.marking_criteria?.must_mention)
        ? rawCase.marking_criteria.must_mention
        : [],
      critical_fail: Array.isArray(rawCase?.marking_criteria?.critical_fail)
        ? rawCase.marking_criteria.critical_fail
        : [],
    },
    allowedUser: Array.isArray(rawCase?.allowedUser) ? rawCase.allowedUser : [],
    modes: {
      calmAndComposed: {
        enabled: calmEnabled,
      },
      fastAndFurious: {
        enabled: fastEnabled,
        questionCount:
          rawCase?.modes?.fastAndFurious?.questionCount || normalizedFastQuestions.length || 3,
        questions:
          normalizedFastQuestions.length > 0
            ? normalizedFastQuestions
            : [createFastQuestion(), createFastQuestion(), createFastQuestion()],
      },
    },
    attemptsCount: typeof rawCase?.attemptsCount === "number" ? rawCase.attemptsCount : 0,
    attempts: Array.isArray(rawCase?.attempts) ? rawCase.attempts : [],
    isActive: typeof rawCase?.isActive === "boolean" ? rawCase.isActive : true,
  };
};

export const toVivaCasePayload = (form: VivaCaseForm) => ({
  case: {
    ...form.case,
  },
  exhibits: form.exhibits,
  marking_criteria: form.marking_criteria,
  allowedUser: form.allowedUser,
  modes: {
    calmAndComposed: {
      enabled: form.modes.calmAndComposed.enabled,
    },
    fastAndFurious: {
      enabled: form.modes.fastAndFurious.enabled,
      questionCount: form.modes.fastAndFurious.questionCount,
      questions: form.modes.fastAndFurious.questions.map((question) => ({
        id: question.id,
        question: question.question,
        answerKeywords: question.answerKeywords,
        linkedExhibitIds: question.linkedExhibitIds,
      })),
    },
  },
});

export const hasConfiguredCalmMode = (vivaCase: Pick<VivaCase, "case" | "modes">) =>
  vivaCase.modes.calmAndComposed.enabled && vivaCase.case.objectives.length > 0;

export const hasConfiguredFastMode = (
  vivaCase: Pick<VivaCase, "modes">
) =>
  vivaCase.modes.fastAndFurious.enabled &&
  vivaCase.modes.fastAndFurious.questions.some((question) => question.question.trim().length > 0);
