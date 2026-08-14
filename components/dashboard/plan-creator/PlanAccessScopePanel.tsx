"use client";

import { Brain, FolderKanban, Layers3, Video } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { SelectionGroup } from "@/components/dashboard/plan-creator/SelectionGroup";
import type { CatalogResponse, PlanAccessScopes } from "@/components/dashboard/plan-creator/types";

export function PlanAccessScopePanel({
  catalog,
  selectedScopes,
  onToggleScope,
}: {
  catalog: CatalogResponse;
  selectedScopes: PlanAccessScopes;
  onToggleScope: (key: keyof PlanAccessScopes, id: string) => void;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Select courses</h2>
          <p className="mt-1 text-sm text-slate-500">
            Selecting a course gives plan members access to the content configured inside that course.
          </p>
        </div>

        <div>
          <SelectionGroup
            title="Courses"
            icon={FolderKanban}
            items={catalog.courses}
            selectedIds={selectedScopes.courseIds}
            onToggle={(id) => onToggleScope("courseIds", id)}
            renderMeta={(item) => (
              <>
                <span>{item.accessTier === "paid" ? "Paid" : "Free"}</span>
                <span>{item.showOnApp ? "Visible on app" : "Hidden on app"}</span>
                <span>{item.sectionsCount ?? 0} sections</span>
              </>
            )}
            fullWidth
          />
        </div>

        <details className="group rounded-2xl border border-slate-200 bg-slate-50">
          <summary className="cursor-pointer list-none px-5 py-4">
            <span className="font-semibold text-slate-800">Advanced access groups</span>
            <span className="ml-2 text-sm font-normal text-slate-500">
              ({selectedScopes.chapterGroupIds.length + selectedScopes.videoSectionIds.length + selectedScopes.vivaFolderIds.length} selected)
            </span>
            <p className="mt-1 text-xs text-slate-500">Add chapter groups, video sections or viva folders only when whole-course access is not enough.</p>
          </summary>

          <div className="grid gap-4 border-t border-slate-200 p-4 md:grid-cols-2">
          <SelectionGroup
            title="Chapter Groups"
            icon={Layers3}
            items={catalog.chapterGroups}
            selectedIds={selectedScopes.chapterGroupIds}
            onToggle={(id) => onToggleScope("chapterGroupIds", id)}
            renderMeta={(item) => (
              <>
                <span>Group scope</span>
                {item.parentId ? <span>Nested</span> : <span>Top level</span>}
              </>
            )}
          />

          <SelectionGroup
            title="Video Sections"
            icon={Video}
            items={catalog.videoSections}
            selectedIds={selectedScopes.videoSectionIds}
            onToggle={(id) => onToggleScope("videoSectionIds", id)}
            renderMeta={(item) => (
              <>
                <span>Section scope</span>
                {item.accessTier ? <span>{item.accessTier}</span> : null}
              </>
            )}
          />

          <SelectionGroup
            title="Viva Folders"
            icon={Brain}
            items={catalog.vivaFolders}
            selectedIds={selectedScopes.vivaFolderIds}
            onToggle={(id) => onToggleScope("vivaFolderIds", id)}
            renderMeta={() => <span>Folder scope</span>}
            fullWidth
          />
          </div>
        </details>
      </CardContent>
    </Card>
  );
}
