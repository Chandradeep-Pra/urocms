"use client";

import type { CourseAccessTier } from "./types";

export function CourseAccessTierSwitch({
  value,
  onChange,
  compact = false,
}: {
  value: CourseAccessTier;
  onChange: (value: CourseAccessTier) => void;
  compact?: boolean;
}) {
  const isMembersOnly = value === "members";

  return (
    <div
      className={`flex items-center ${compact ? "justify-between gap-4" : "justify-between rounded-2xl border border-slate-200 px-4 py-3"}`}
    >
      <div>
        <p
          className={
            compact
              ? "text-xs font-semibold uppercase tracking-[0.16em] text-slate-400"
              : "text-sm font-medium text-slate-900"
          }
        >
          Course Access
        </p>
        <p className={compact ? "mt-2 text-sm text-slate-600" : "text-xs text-slate-500"}>
          {compact
            ? "Switch this course between free and member-only access."
            : "Toggle this course between free access and member-only access."}
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isMembersOnly}
        onClick={() => onChange(isMembersOnly ? "free" : "members")}
        className={`inline-flex min-w-[132px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
          isMembersOnly
            ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
            : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
        }`}
      >
        {isMembersOnly ? "Members Only" : "Free"}
      </button>
    </div>
  );
}
