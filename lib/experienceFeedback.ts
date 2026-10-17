export type ExperienceFeedbackKind = "mock" | "viva" | "webapp" | "app";
export type FeedbackPlatform = "web" | "mobile";
export type FeedbackCategory = "mock" | "viva" | "webapp" | "app";

export type FeedbackFilter = { key: string; label: string; count: number };
export type FeedbackInboxItem = {
  id: string;
  category: FeedbackCategory;
  categoryLabel: string;
  kind: ExperienceFeedbackKind;
  platform: FeedbackPlatform;
  contextId: string | null;
  contextTitle: string | null;
  candidate: { uid: string | null; name: string | null; email: string | null };
  ratings: Array<{ key: string; label: string; value: number }>;
  reason: string | null;
  comment: string | null;
  submittedAt: string;
};

export type FeedbackInboxResponse = {
  filters: FeedbackFilter[];
  items: FeedbackInboxItem[];
  nextCursor: string | null;
};
