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

export interface VivaCase {
  id: string;
  mode?: VivaMode;
  case: {
    title: string;
    level: string;
    stem: string;
    objectives: string[];
    fastAndFuriousQuestions?: Array<{
      [key: string]: {
        question: string;
        image: {
          imageUrl?: string;
          imageName?: string;
          imageDesc?: string;
        };
      };
    }>;
  };
  exhibits: {
    label: string;
    url: string;
    description: string;
  }[];
  marking_criteria: {
    must_mention: string[];
    critical_fail: string[];
  };
  attemptsCount?: number;
  attempts?: Attempt[];
}

export interface FastQuestionImage {
  imageName: string;
  imageUrl: string;
  imageDesc: string;
}

export interface FastQuestionConfig {
  id: string;
  question: string;
  imageEnabled: boolean;
  image: FastQuestionImage;
}

export interface VivaCaseForm {
  mode: VivaMode;
  case: {
    title: string;
    level: string;
    stem: string;
    objectives: string[];
  };
  exhibits: {
    label: string;
    url: string;
    description: string;
  }[];
  marking_criteria: {
    must_mention: string[];
    critical_fail: string[];
  };
  fastAndFurious: {
    questionCount: number;
    questions: FastQuestionConfig[];
  };
}

export const createFastQuestion = (index: number): FastQuestionConfig => ({
  id: `question-${index + 1}`,
  question: "",
  imageEnabled: false,
  image: {
    imageName: `Question ${index + 1} Image`,
    imageUrl: "",
    imageDesc: "",
  },
});

export const createInitialVivaForm = (): VivaCaseForm => ({
  mode: "Calm and Composed",
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
  fastAndFurious: {
    questionCount: 3,
    questions: [0, 1, 2].map((index) => createFastQuestion(index)),
  },
});
