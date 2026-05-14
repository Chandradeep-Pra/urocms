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
      <CardContent className="space-y-6 p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Scope-based access</h2>
          <p className="mt-1 text-sm text-slate-500">
            Build plans around courses first, then add chapter groups, video sections, and viva
            folders when you need deeper scope control.
          </p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
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
      </CardContent>
    </Card>
  );
}
