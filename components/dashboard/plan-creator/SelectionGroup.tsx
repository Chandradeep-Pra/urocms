"use client";

import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/dashboard/shared/EmptyState";
import type { CatalogItem } from "@/components/dashboard/plan-creator/types";

export function SelectionGroup({
  title,
  icon: Icon,
  items,
  selectedIds,
  onToggle,
  renderMeta,
  fullWidth = false,
}: {
  title: string;
  icon: LucideIcon;
  items: CatalogItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  renderMeta: (item: CatalogItem) => ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{title}</p>
              <p className="text-xs text-slate-500">{selectedIds.length} selected</p>
            </div>
          </div>
          <Badge variant="outline" className="border-slate-200 text-slate-600">
            {items.length}
          </Badge>
        </div>

        <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <EmptyState
              icon={Icon}
              title="No items found"
              description="There is nothing in this catalog section yet."
            />
          ) : (
            items.map((item) => {
              const checked = selectedIds.includes(item.id);

              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                    checked
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-sm font-medium ${
                        checked ? "text-white" : "text-slate-900"
                      }`}
                    >
                      {item.title}
                    </p>
                    <div
                      className={`mt-1 flex flex-wrap gap-2 text-xs ${
                        checked ? "text-white/70" : "text-slate-500"
                      }`}
                    >
                      {renderMeta(item)}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

export function PlanCountBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
      {label}: {value}
    </span>
  );
}
