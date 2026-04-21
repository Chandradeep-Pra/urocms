"use client";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import type { VivaMode } from "@/components/viva/types";

interface VivaModeSelectorProps {
  mode: VivaMode;
  questionCount: number;
  onModeChange: (mode: VivaMode) => void;
  onConfigureFastMode: () => void;
}

const MODES: VivaMode[] = ["Calm and Composed", "Fast and Furious"];

export function VivaModeSelector({
  mode,
  questionCount,
  onModeChange,
  onConfigureFastMode,
}: VivaModeSelectorProps) {
  return (
    <section className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <Label className="text-sm font-semibold text-slate-800">
            🎭 Case Mode
          </Label>
          <p className="text-xs text-slate-500">Pick one mode</p>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {MODES.map((option) => {
          const active = mode === option;

          return (
            <button
              key={option}
              type="button"
              onClick={() => onModeChange(option)}
              className={`rounded-2xl border px-4 py-4 text-left transition-all ${
                active
                  ? "border-teal-500 bg-white shadow-sm ring-2 ring-teal-100"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="font-medium text-slate-800">
                  {option === "Calm and Composed"
                    ? "🧘 Calm and Composed"
                    : "⚡ Fast and Furious"}
                </p>
                {active && (
                  <span className="rounded-full bg-teal-100 px-2 py-0.5 text-[11px] font-medium text-teal-700">
                    Selected
                  </span>
                )}
              </div>
              <p className="mt-2 text-xs text-slate-500">
                {option === "Calm and Composed" ? "Standard flow" : "Quick question round"}
              </p>
            </button>
          );
        })}
      </div>

      {mode === "Fast and Furious" && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-amber-900">
              ⚡ {questionCount} questions ready
            </p>
          </div>
          <Button type="button" variant="outline" onClick={onConfigureFastMode}>
            Edit
          </Button>
        </div>
      )}
    </section>
  );
}
