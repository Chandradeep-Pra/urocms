"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VivaCaseForm } from "@/components/viva/types";

interface FastAndFuriousDialogProps {
  open: boolean;
  form: VivaCaseForm;
  onOpenChange: (open: boolean) => void;
  onQuestionCountChange: (count: number) => void;
  onQuestionTextChange: (questionIndex: number, value: string) => void;
  onQuestionKeywordsChange: (questionIndex: number, value: string) => void;
  onToggleQuestionExhibit: (questionIndex: number, exhibitId: string) => void;
}

export function FastAndFuriousDialog({
  open,
  form,
  onOpenChange,
  onQuestionCountChange,
  onQuestionTextChange,
  onQuestionKeywordsChange,
  onToggleQuestionExhibit,
}: FastAndFuriousDialogProps) {
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);

  useEffect(() => {
    if (activeQuestionIndex > form.modes.fastAndFurious.questions.length - 1) {
      setActiveQuestionIndex(Math.max(0, form.modes.fastAndFurious.questions.length - 1));
    }
  }, [activeQuestionIndex, form.modes.fastAndFurious.questions.length]);

  const questionCount = form.modes.fastAndFurious.questionCount;
  const totalExhibits = form.exhibits.length;
  const configuredQuestions = form.modes.fastAndFurious.questions.filter((question) =>
    question.question.trim()
  ).length;
  const activeQuestion = form.modes.fastAndFurious.questions[activeQuestionIndex];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="!w-[80vw] !max-w-[80vw] sm:!max-w-[80vw] overflow-hidden border-0 bg-transparent p-0 shadow-none">
        <div className="mx-auto flex h-[88vh] w-full flex-col overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-2xl">
          <DialogHeader className="sticky top-0 z-10 border-b bg-white px-8 py-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div className="space-y-1">
                <DialogTitle>Fast and Furious Setup</DialogTitle>
                <p className="text-sm text-slate-500">
                  Build rapid-fire questions, add answer keywords, and link each one to shared exhibits.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Questions
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">{questionCount}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Configured
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">
                    {configuredQuestions}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[11px] uppercase tracking-[0.16em] text-slate-400">
                    Exhibits
                  </p>
                  <p className="mt-1 text-lg font-semibold text-slate-800">{totalExhibits}</p>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-hidden bg-slate-50 px-8 py-6">
            <div className="grid h-full min-h-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
              <div className="flex h-full min-h-0 flex-col rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-1">
                  <Label htmlFor="fast-question-count" className="text-sm font-semibold text-slate-800">
                    Question Count
                  </Label>
                  <p className="text-xs text-slate-500">
                    Pick the number of rapid-fire prompts for this case.
                  </p>
                </div>

                <Input
                  id="fast-question-count"
                  type="number"
                  min={1}
                  value={questionCount}
                  onChange={(e) => onQuestionCountChange(Number(e.target.value || 1))}
                  className="mt-4 h-11"
                />

                <div className="mt-5 mb-3 flex items-center justify-between">
                  <p className="text-sm font-semibold text-slate-800">Questions</p>
                  <p className="text-xs text-slate-500">Click to edit</p>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto pr-1">
                  <div className="space-y-3">
                  {form.modes.fastAndFurious.questions.map((question, index) => {
                    const ready = question.question.trim().length > 0;
                    const linkedCount = question.linkedExhibitIds.length;
                    const keywordCount = question.answerKeywords.length;
                    const active = activeQuestionIndex === index;

                    return (
                      <button
                        key={question.id}
                        type="button"
                        onClick={() => setActiveQuestionIndex(index)}
                        className={`w-full rounded-2xl border px-3 py-3 text-left transition ${
                          active
                            ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100"
                            : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-800">
                            Question {index + 1}
                          </p>
                          <span
                            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              ready
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-200 text-slate-600"
                            }`}
                          >
                            {ready ? "Ready" : "Draft"}
                          </span>
                        </div>
                        <p className="mt-2 text-xs text-slate-500">
                          {linkedCount} exhibits linked, {keywordCount} keywords
                        </p>
                      </button>
                    );
                  })}
                  </div>
                </div>
              </div>

              <div className="min-h-0 overflow-y-auto rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                {activeQuestion && (
                  <>
                    <div className="flex flex-col gap-3 border-b border-slate-100 pb-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <h4 className="text-base font-semibold text-slate-800">
                          Question {activeQuestionIndex + 1}
                        </h4>
                        <p className="text-sm text-slate-500">
                          Add the prompt, enter answer keywords, and attach the shared exhibits this question should show.
                        </p>
                      </div>

                      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700">
                        {activeQuestion.linkedExhibitIds.length} exhibit
                        {activeQuestion.linkedExhibitIds.length === 1 ? "" : "s"} linked
                      </span>
                    </div>

                    <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1.05fr)_minmax(340px,0.95fr)]">
                      <div className="space-y-5">
                        <div className="space-y-3">
                          <Label className="text-sm font-semibold text-slate-800">
                            Prompt
                          </Label>
                          <Textarea
                            placeholder={`Enter question ${activeQuestionIndex + 1}`}
                            value={activeQuestion.question}
                            onChange={(e) =>
                              onQuestionTextChange(activeQuestionIndex, e.target.value)
                            }
                            className="min-h-[120px] rounded-2xl border-slate-200 bg-slate-50"
                          />
                        </div>

                        <div className="space-y-3">
                          <div className="space-y-1">
                            <Label className="text-sm font-semibold text-slate-800">
                              Answer Keywords
                            </Label>
                            <p className="text-xs text-slate-500">
                              Add keywords separated by spaces. They will be stored as an array on save.
                            </p>
                          </div>

                          <Input
                            placeholder="e.g. sepsis obstruction decompression antibiotics"
                            value={activeQuestion.answerKeywords.join(" ")}
                            onChange={(e) =>
                              onQuestionKeywordsChange(activeQuestionIndex, e.target.value)
                            }
                            className="h-11 rounded-2xl border-slate-200 bg-slate-50"
                          />

                          {activeQuestion.answerKeywords.length > 0 && (
                            <div className="flex flex-wrap gap-2">
                              {activeQuestion.answerKeywords.map((keyword) => (
                                <span
                                  key={`${activeQuestion.id}-${keyword}`}
                                  className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                                >
                                  {keyword}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="space-y-3">
                        <div className="space-y-1">
                          <p className="text-sm font-semibold text-slate-800">
                            Shared Exhibits
                          </p>
                          <p className="text-xs text-slate-500">
                            Attach the exhibits that should appear with this question.
                          </p>
                        </div>

                        {form.exhibits.length === 0 ? (
                          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-sm text-slate-500">
                            No shared exhibits yet. Add them in the main case form first.
                          </div>
                        ) : (
                          <div className="grid max-h-[420px] gap-3 overflow-y-auto pr-1">
                            {form.exhibits.map((exhibit) => {
                              const selected = activeQuestion.linkedExhibitIds.includes(exhibit.id);

                              return (
                                <button
                                  key={exhibit.id}
                                  type="button"
                                  onClick={() =>
                                    onToggleQuestionExhibit(activeQuestionIndex, exhibit.id)
                                  }
                                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                                    selected
                                      ? "border-teal-500 bg-teal-50 ring-2 ring-teal-100"
                                      : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white"
                                  }`}
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm font-medium text-slate-800">
                                        {exhibit.label || "Untitled exhibit"}
                                      </p>
                                      <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                        {exhibit.description || "No description yet"}
                                      </p>
                                    </div>

                                    <span
                                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                                        selected
                                          ? "bg-teal-600 text-white"
                                          : "bg-white text-slate-500"
                                      }`}
                                    >
                                      {selected ? "Attached" : "Attach"}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t bg-white px-8 py-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Close
            </Button>
            <Button
              type="button"
              className="bg-teal-600 text-white hover:bg-teal-700"
              onClick={() => onOpenChange(false)}
            >
              Save
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
