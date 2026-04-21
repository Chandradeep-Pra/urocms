"use client";

import { Button } from "@/components/ui/button";
import type { VivaMode } from "@/components/viva/types";

interface VivaModeSelectorProps {
  activeMode: VivaMode;
  calmEnabled: boolean;
  fastEnabled: boolean;
  fastQuestionCount: number;
  onModeSelect: (mode: VivaMode) => void;
  onToggleMode: (mode: VivaMode) => void;
  onConfigureFastMode: () => void;
}

const MODES: VivaMode[] = ["Calm and Composed", "Fast and Furious"];

export function VivaModeSelector({
  activeMode,
  calmEnabled,
  fastEnabled,
  fastQuestionCount,
  onModeSelect,
  onToggleMode,
  onConfigureFastMode,
}: VivaModeSelectorProps) {
  const isEnabled = (mode: VivaMode) =>
    mode === "Calm and Composed" ? calmEnabled : fastEnabled;

  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-slate-800">Mode Setup</p>
        <p className="text-xs text-slate-500">
          Configure one shared case with one or both viva modes.
        </p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {MODES.map((mode) => {
          const active = activeMode === mode;
          const enabled = isEnabled(mode);

          return (
            <div
              key={mode}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                active
                  ? "border-teal-500 bg-white shadow-sm ring-2 ring-teal-100"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="font-medium text-slate-800">
                  {mode === "Calm and Composed"
                    ? "Calm and Composed"
                    : "Fast and Furious"}
                </p>
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                    enabled
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {enabled ? "Enabled" : "Not set"}
                </span>
              </div>

              <p className="mt-2 text-xs text-slate-500">
                {mode === "Calm and Composed"
                  ? "Shared stem with objectives and marking criteria."
                  : "Rapid questions linked to the shared exhibit library."}
              </p>

              <div className="mt-4 flex items-center justify-between gap-2">
                <Button
                  type="button"
                  variant={active ? "secondary" : "ghost"}
                  onClick={() => onModeSelect(mode)}
                >
                  Open
                </Button>

                <Button
                  type="button"
                  variant={enabled ? "outline" : "default"}
                  className={!enabled ? "bg-teal-600 text-white hover:bg-teal-700" : ""}
                  onClick={() => onToggleMode(mode)}
                >
                  {enabled ? "Disable" : "Enable"}
                </Button>

                {mode === "Fast and Furious" && enabled && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={onConfigureFastMode}
                  >
                    {fastQuestionCount} questions
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
