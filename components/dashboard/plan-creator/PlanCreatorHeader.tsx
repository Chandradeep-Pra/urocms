"use client";

import { CopyPlus, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";

export function PlanCreatorHeader({
  onRefresh,
  onReset,
  onImportPresets,
  importingPresets,
}: {
  onRefresh: () => void;
  onReset: () => void;
  onImportPresets: () => void;
  importingPresets: boolean;
}) {
  return (
    <SectionHeader
      eyebrow="Plan Creator"
      title="Build highly customizable pricing plans"
      description="Use your exact FRCS pricing structure, add display-friendly duration labels, and launch temporary coupons whenever you want a campaign push."
      actions={
        <>
          <Button variant="outline" onClick={onRefresh} className="border-slate-200 bg-white">
            <RefreshCcw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button variant="outline" onClick={onReset} className="border-slate-200 bg-white">
            Reset Form
          </Button>
          <Button
            onClick={onImportPresets}
            disabled={importingPresets}
            className="bg-slate-900 text-white"
          >
            <CopyPlus className="mr-2 h-4 w-4" />
            {importingPresets ? "Importing..." : "Load FRCS Presets"}
          </Button>
        </>
      }
    />
  );
}
