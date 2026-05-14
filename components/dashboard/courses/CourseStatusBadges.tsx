"use client";

import { Badge } from "@/components/ui/badge";
import type { CourseAccessTier } from "./types";

export function CourseAccessBadge({ accessTier }: { accessTier?: CourseAccessTier }) {
  const membersOnly = accessTier === "members";

  return (
    <Badge
      variant="outline"
      className={
        membersOnly
          ? "border-amber-200 bg-amber-50 text-amber-700"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"
      }
    >
      {membersOnly ? "Members Only" : "Free Course"}
    </Badge>
  );
}

export function CourseVisibilityBadge({ showOnApp }: { showOnApp?: boolean }) {
  return (
    <Badge
      variant="outline"
      className={
        showOnApp
          ? "border-cyan-200 bg-cyan-50 text-cyan-700"
          : "border-slate-200 bg-slate-100 text-slate-600"
      }
    >
      {showOnApp ? "Visible On App" : "Hidden From App"}
    </Badge>
  );
}
