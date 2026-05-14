"use client";

import {
  BookOpen,
  Brain,
  ClipboardList,
  FileQuestion,
  Sparkles,
  Video,
} from "lucide-react";
import type { IconKey } from "./types";

export const iconOptions = [
  { key: "book-open", label: "Book Open", icon: BookOpen },
  { key: "video", label: "Video", icon: Video },
  { key: "brain", label: "Brain", icon: Brain },
  { key: "clipboard-list", label: "Clipboard List", icon: ClipboardList },
  { key: "sparkles", label: "Sparkles", icon: Sparkles },
  { key: "file-question", label: "File Question", icon: FileQuestion },
] as const;

export function getCourseIcon(iconKey: IconKey) {
  return iconOptions.find((item) => item.key === iconKey)?.icon || BookOpen;
}
