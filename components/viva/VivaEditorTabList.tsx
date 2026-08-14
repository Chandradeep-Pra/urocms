"use client";

import { BarChart3, FileText, Images, ListChecks } from "lucide-react";

export type VivaEditorTab = "details" | "images" | "usage" | "questions";

const TABS = [
  { value: "details" as const, label: "Case Details", icon: FileText },
  { value: "images" as const, label: "Images", icon: Images },
  { value: "usage" as const, label: "Viva Use", icon: BarChart3 },
  { value: "questions" as const, label: "Question Configuration", icon: ListChecks },
];

export function VivaEditorTabList({
  value,
  onValueChange,
}: {
  value: VivaEditorTab;
  onValueChange: (value: VivaEditorTab) => void;
}) {
  return (
    <nav
      aria-label="AI viva case editor"
      className="grid w-full grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm lg:grid-cols-4"
    >
      {TABS.map(({ value: tabValue, label, icon: Icon }) => {
        const active = value === tabValue;
        return (
          <button
            key={tabValue}
            type="button"
            aria-current={active ? "page" : undefined}
            onClick={() => onValueChange(tabValue)}
            className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition ${
              active
                ? "bg-teal-600 text-white shadow-sm"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}
