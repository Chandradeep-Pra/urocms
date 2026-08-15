"use client";

import { Brain, Clock3, FolderKanban, Layers3, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SearchBar } from "@/components/dashboard/shared/SearchBar";
import { SelectionGroup } from "@/components/dashboard/plan-creator/SelectionGroup";
import type { CatalogResponse, PlanSelection } from "@/components/dashboard/plan-creator/types";

export function PlanManualOverridePanel({
  catalog,
  search,
  onSearchChange,
  selectedContent,
  onToggleSelection,
}: {
  catalog: Pick<CatalogResponse, "chapters" | "videos" | "quizzes" | "mocks" | "vivaCases">;
  search: string;
  onSearchChange: (value: string) => void;
  selectedContent: PlanSelection;
  onToggleSelection: (key: keyof PlanSelection, id: string) => void;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Manual overrides</h2>
            <p className="mt-1 text-sm text-slate-500">
              Use exact items only when a plan needs something more custom than scope-based access.
            </p>
          </div>

          <SearchBar
            value={search}
            onChange={onSearchChange}
            placeholder="Search content..."
            className="w-full max-w-sm"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <SelectionGroup
            title="Chapters"
            icon={Layers3}
            items={catalog.chapters}
            selectedIds={selectedContent.chapterIds}
            onToggle={(id) => onToggleSelection("chapterIds", id)}
            renderMeta={(item) => (
              <>
                <span>{item.nodeType || "TEST"}</span>
                {item.isPremium ? <span>Premium source</span> : null}
              </>
            )}
          />

          <SelectionGroup
            title="Videos"
            icon={Video}
            items={catalog.videos}
            selectedIds={selectedContent.videoIds}
            onToggle={(id) => onToggleSelection("videoIds", id)}
            renderMeta={(item) => (
              <>
                <span>{item.accessTier === "paid" ? "Paid video" : "Free video"}</span>
                <span>{item.type || item.accessTier || "Video"}</span>
              </>
            )}
          />

          <SelectionGroup
            title="Quizzes"
            icon={FolderKanban}
            items={catalog.quizzes}
            selectedIds={selectedContent.quizIds}
            onToggle={(id) => onToggleSelection("quizIds", id)}
            renderMeta={(item) => (
              <>
                <span>{item.type || "chapter"}</span>
                {item.durationMinutes ? <span>{item.durationMinutes} min</span> : null}
              </>
            )}
          />

          <SelectionGroup
            title="Scheduled Mocks"
            icon={Clock3}
            items={catalog.mocks}
            selectedIds={selectedContent.mockIds}
            onToggle={(id) => onToggleSelection("mockIds", id)}
            renderMeta={(item) => (
              <>
                <span>{item.type || "mock"}</span>
                <span>{item.attemptsCount ?? 0} attempts</span>
              </>
            )}
          />

          <SelectionGroup
            title="AI Viva Sets"
            icon={Brain}
            items={catalog.vivaCases}
            selectedIds={selectedContent.vivaCaseIds}
            onToggle={(id) => onToggleSelection("vivaCaseIds", id)}
            renderMeta={(item) => (
              <>
                <span>AI Viva</span>
                <span>{item.attemptsCount ?? 0} attempts</span>
              </>
            )}
            fullWidth
          />
        </div>
      </CardContent>
    </Card>
  );
}
