export type ContentType =
  | "videos"
  | "chapter-quizzes"
  | "mocks"
  | "grand-mocks"
  | "ai-vivas";

export type IconKey =
  | "book-open"
  | "video"
  | "brain"
  | "clipboard-list"
  | "sparkles"
  | "file-question";

export type CourseAccessTier = "free" | "members";

export type CourseSection = {
  id: string;
  iconKey: IconKey;
  title: string;
  contentType: ContentType;
  linkedContentIds: string[];
};

export type Course = {
  id: string;
  title: string;
  description?: string;
  slug?: string;
  accessTier?: CourseAccessTier;
  showOnApp?: boolean;
  memberUserIds?: string[];
  memberUsers?: Array<{ id: string; name?: string; email?: string }>;
  sections?: CourseSection[];
};

export type CatalogItem = {
  id: string;
  title: string;
  subtitle?: string;
};

export type CourseMemberUser = {
  id: string;
  name: string;
  email: string;
  tier: "guest" | "free" | "paid";
  activeCourseIds: string[];
};

export type SectionCatalog = Record<ContentType, CatalogItem[]>;

export const contentTypeLabels: Record<ContentType, string> = {
  videos: "Videos",
  "chapter-quizzes": "Chapter Quizzes",
  mocks: "Mocks",
  "grand-mocks": "Grand Mocks",
  "ai-vivas": "AI Vivas",
};

export const emptySection: CourseSection = {
  id: "",
  iconKey: "book-open",
  title: "",
  contentType: "videos",
  linkedContentIds: [],
};

export const emptyCourseForm = {
  title: "",
  description: "",
  accessTier: "free" as CourseAccessTier,
  showOnApp: false,
};
