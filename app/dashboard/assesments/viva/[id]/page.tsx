"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FastAndFuriousDialog } from "@/components/viva/FastAndFuriousDialog";
import { VivaModeSelector } from "@/components/viva/VivaModeSelector";
import {
  createExhibit,
  hasConfiguredCalmMode,
  hasConfiguredFastMode,
  normalizeVivaCase,
  toVivaCasePayload,
  type VivaCase,
  type VivaMode,
} from "@/components/viva/types";

export default function CaseDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [caseData, setCaseData] = useState<VivaCase | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeMode, setActiveMode] = useState<VivaMode>("Calm and Composed");
  const [fastModeDialogOpen, setFastModeDialogOpen] = useState(false);
  const [fastKeywordInputs, setFastKeywordInputs] = useState<Record<string, string>>({});

  const fetchCase = async () => {
    try {
      const res = await fetch(`/api/viva-cases/${id}`);
      const data = await res.json();
      const normalizedCase = normalizeVivaCase(data.case);
      setCaseData(normalizedCase);
      setFastKeywordInputs(
        Object.fromEntries(
          normalizedCase.modes.fastAndFurious.questions.map((question) => [
            question.id,
            question.answerKeywords.join(", "),
          ])
        )
      );
    } catch {
      toast.error("Failed to load case");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchCase();
  }, [id]);

  const handleUpdate = async () => {
    if (!caseData) return;

    setSaving(true);

    try {
      const res = await fetch(`/api/viva-cases/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toVivaCasePayload(caseData)),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Update failed");
      }

      toast.success("Case updated successfully");
    } catch (error: any) {
      toast.error(error.message || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const toggleMode = (mode: VivaMode) => {
    if (!caseData) return;

    setCaseData((prev) => {
      if (!prev) return prev;

      if (mode === "Calm and Composed") {
        return {
          ...prev,
          modes: {
            ...prev.modes,
            calmAndComposed: {
              enabled: !prev.modes.calmAndComposed.enabled,
            },
          },
        };
      }

      const nextEnabled = !prev.modes.fastAndFurious.enabled;

      return {
        ...prev,
        modes: {
          ...prev.modes,
          fastAndFurious: {
            ...prev.modes.fastAndFurious,
            enabled: nextEnabled,
          },
        },
      };
    });

    if (mode === "Fast and Furious" && !caseData.modes.fastAndFurious.enabled) {
      setFastModeDialogOpen(true);
      setActiveMode("Fast and Furious");
    }
  };

  const syncFastQuestionCount = (nextCount: number) => {
    setCaseData((prev) => {
      if (!prev) return prev;

      const safeCount = Number.isFinite(nextCount) ? Math.max(1, nextCount) : 1;
      const questions = [...prev.modes.fastAndFurious.questions];

      while (questions.length < safeCount) {
        questions.push({
          id: `question-${Math.random().toString(36).slice(2, 10)}`,
          question: "",
          answerKeywords: [],
          linkedExhibitIds: [],
        });
      }

      return {
        ...prev,
        modes: {
          ...prev.modes,
          fastAndFurious: {
            ...prev.modes.fastAndFurious,
            questionCount: safeCount,
            questions: questions.slice(0, safeCount),
          },
        },
      };
    });
  };

  const updateFastQuestionText = (questionIndex: number, value: string) => {
    setCaseData((prev) => {
      if (!prev) return prev;

      const questions = [...prev.modes.fastAndFurious.questions];
      questions[questionIndex] = {
        ...questions[questionIndex],
        question: value,
      };

      return {
        ...prev,
        modes: {
          ...prev.modes,
          fastAndFurious: {
            ...prev.modes.fastAndFurious,
            questions,
          },
        },
      };
    });
  };

  const updateFastQuestionKeywords = (questionIndex: number, value: string) => {
    setCaseData((prev) => {
      if (!prev) return prev;

      const question = prev.modes.fastAndFurious.questions[questionIndex];
      const answerKeywords = value
        .split(",")
        .map((keyword) => keyword.trim())
        .filter(Boolean);

      setFastKeywordInputs((current) => ({
        ...current,
        [question.id]: value,
      }));

      const questions = [...prev.modes.fastAndFurious.questions];
      questions[questionIndex] = {
        ...questions[questionIndex],
        answerKeywords,
      };

      return {
        ...prev,
        modes: {
          ...prev.modes,
          fastAndFurious: {
            ...prev.modes.fastAndFurious,
            questions,
          },
        },
      };
    });
  };

  const toggleFastQuestionExhibit = (questionIndex: number, exhibitId: string) => {
    setCaseData((prev) => {
      if (!prev) return prev;

      const questions = [...prev.modes.fastAndFurious.questions];
      const question = questions[questionIndex];
      const linkedExhibitIds = question.linkedExhibitIds.includes(exhibitId)
        ? question.linkedExhibitIds.filter((id) => id !== exhibitId)
        : [...question.linkedExhibitIds, exhibitId];

      questions[questionIndex] = {
        ...question,
        linkedExhibitIds,
      };

      return {
        ...prev,
        modes: {
          ...prev.modes,
          fastAndFurious: {
            ...prev.modes.fastAndFurious,
            questions,
          },
        },
      };
    });
  };

  if (loading) {
    return (
      <div className="mt-10 flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
      </div>
    );
  }

  if (!caseData) return <p>No data found</p>;

  const calmReady = hasConfiguredCalmMode(caseData);
  const fastReady = hasConfiguredFastMode(caseData);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-teal-50">
      <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl space-y-3 px-6 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="rounded-lg p-2 transition hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </button>

              <Input
                value={caseData.case.title}
                onChange={(e) =>
                  setCaseData({
                    ...caseData,
                    case: { ...caseData.case, title: e.target.value },
                  })
                }
                className="h-11 w-[340px] border-none bg-transparent px-0 text-xl font-semibold text-slate-900 shadow-none focus-visible:ring-0"
                placeholder="Untitled Case"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {caseData.case.level}
              </span>
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                Calm: {calmReady ? "Ready" : "Not set"}
              </span>
              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs text-amber-700">
                Fast: {fastReady ? "Ready" : "Not set"}
              </span>
              <Button
                onClick={handleUpdate}
                disabled={saving}
                className="bg-teal-600 px-5 text-white hover:bg-teal-700"
              >
                {saving ? "Saving..." : "Save"}
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 pl-11 text-xs text-slate-500">
            <span>{caseData.exhibits.length} shared exhibits</span>
            <span className="h-3 w-px bg-slate-300" />
            <span>ID: {id}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-8 p-6">
        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="space-y-1">
            <h3 className="font-semibold text-slate-800">Shared Case Details</h3>
            <p className="text-sm text-slate-500">
              Title, stem, allowed users, and shared exhibits apply to both modes.
            </p>
          </div>

          <Input
            value={caseData.case.title}
            onChange={(e) =>
              setCaseData({
                ...caseData,
                case: { ...caseData.case, title: e.target.value },
              })
            }
            placeholder="Title"
          />

          <Textarea
            value={caseData.case.stem}
            onChange={(e) =>
              setCaseData({
                ...caseData,
                case: { ...caseData.case, stem: e.target.value },
              })
            }
            placeholder="Clinical Stem"
          />
        </section>

        <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h3 className="font-semibold text-slate-800">Allowed Users</h3>

          {caseData.allowedUser.map((email, index) => (
            <div key={`allowed-user-${index}`} className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => {
                  const allowedUser = [...caseData.allowedUser];
                  allowedUser[index] = e.target.value.toLowerCase();
                  setCaseData({ ...caseData, allowedUser });
                }}
                placeholder="Enter email"
              />

              <Button
                variant="outline"
                onClick={() =>
                  setCaseData({
                    ...caseData,
                    allowedUser: caseData.allowedUser.filter((_, itemIndex) => itemIndex !== index),
                  })
                }
              >
                Remove
              </Button>
            </div>
          ))}

          <Button
            variant="secondary"
            onClick={() =>
              setCaseData({
                ...caseData,
                allowedUser: [...caseData.allowedUser, ""],
              })
            }
          >
            Add Email
          </Button>
        </section>

        <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800">Shared Exhibits</h3>
              <p className="text-sm text-slate-500">
                Calm mode sees the full library. Fast mode attaches exhibits question by question.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() =>
                setCaseData({
                  ...caseData,
                  exhibits: [...caseData.exhibits, createExhibit()],
                })
              }
            >
              Add Exhibit
            </Button>
          </div>

          {caseData.exhibits.map((exhibit, index) => (
            <div key={exhibit.id} className="space-y-4 rounded-xl border bg-slate-50 p-4">
              <Input
                value={exhibit.label}
                onChange={(e) => {
                  const exhibits = [...caseData.exhibits];
                  exhibits[index] = { ...exhibits[index], label: e.target.value };
                  setCaseData({ ...caseData, exhibits });
                }}
                placeholder="Label"
              />

              {exhibit.url && (
                <div className="relative">
                  <img
                    src={exhibit.url}
                    alt="Exhibit"
                    className="max-h-72 w-full rounded-lg border object-cover"
                  />
                </div>
              )}

              <div className="flex gap-2">
                <Input
                  value={exhibit.url}
                  onChange={(e) => {
                    const exhibits = [...caseData.exhibits];
                    exhibits[index] = { ...exhibits[index], url: e.target.value };
                    setCaseData({ ...caseData, exhibits });
                  }}
                  placeholder="Image URL"
                />

                {exhibit.url && (
                  <a
                    href={exhibit.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-center rounded-lg border px-3 hover:bg-slate-100"
                  >
                    <ExternalLink size={16} />
                  </a>
                )}
              </div>

              <Textarea
                value={exhibit.description}
                onChange={(e) => {
                  const exhibits = [...caseData.exhibits];
                  exhibits[index] = { ...exhibits[index], description: e.target.value };
                  setCaseData({ ...caseData, exhibits });
                }}
                placeholder="Description"
              />

              <div className="flex justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    const removedId = exhibit.id;
                    setCaseData({
                      ...caseData,
                      exhibits: caseData.exhibits.filter((_, itemIndex) => itemIndex !== index),
                      modes: {
                        ...caseData.modes,
                        fastAndFurious: {
                          ...caseData.modes.fastAndFurious,
                          questions: caseData.modes.fastAndFurious.questions.map((question) => ({
                            ...question,
                            linkedExhibitIds: question.linkedExhibitIds.filter(
                              (linkedId) => linkedId !== removedId
                            ),
                          })),
                        },
                      },
                    });
                  }}
                >
                  Remove Exhibit
                </Button>
              </div>
            </div>
          ))}
        </section>

        <VivaModeSelector
          activeMode={activeMode}
          calmEnabled={caseData.modes.calmAndComposed.enabled}
          fastEnabled={caseData.modes.fastAndFurious.enabled}
          fastQuestionCount={caseData.modes.fastAndFurious.questionCount}
          onModeSelect={setActiveMode}
          onToggleMode={toggleMode}
          onConfigureFastMode={() => setFastModeDialogOpen(true)}
        />

        {activeMode === "Calm and Composed" && (
          <>
            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-slate-800">Calm Objectives</h3>
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    calmReady ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {calmReady ? "Ready" : "Needs setup"}
                </span>
              </div>

              {caseData.case.objectives.map((objective, index) => (
                <div key={`objective-${index}`} className="flex gap-2">
                  <Input
                    value={objective}
                    onChange={(e) => {
                      const objectives = [...caseData.case.objectives];
                      objectives[index] = e.target.value;
                      setCaseData({
                        ...caseData,
                        case: { ...caseData.case, objectives },
                      });
                    }}
                  />
                  <Button
                    variant="outline"
                    onClick={() =>
                      setCaseData({
                        ...caseData,
                        case: {
                          ...caseData.case,
                          objectives: caseData.case.objectives.filter(
                            (_, itemIndex) => itemIndex !== index
                          ),
                        },
                      })
                    }
                  >
                    Remove
                  </Button>
                </div>
              ))}

              <Button
                variant="secondary"
                onClick={() =>
                  setCaseData({
                    ...caseData,
                    case: {
                      ...caseData.case,
                      objectives: [...caseData.case.objectives, ""],
                    },
                  })
                }
              >
                Add Objective
              </Button>
            </section>

            <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-semibold text-slate-800">Marking Criteria</h3>

              <div>
                <p className="mb-2 text-sm text-slate-500">Must Mention</p>
                {caseData.marking_criteria.must_mention.map((item, index) => (
                  <div key={`must-mention-${index}`} className="mb-2 flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const mustMention = [...caseData.marking_criteria.must_mention];
                        mustMention[index] = e.target.value;
                        setCaseData({
                          ...caseData,
                          marking_criteria: {
                            ...caseData.marking_criteria,
                            must_mention: mustMention,
                          },
                        });
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCaseData({
                          ...caseData,
                          marking_criteria: {
                            ...caseData.marking_criteria,
                            must_mention: caseData.marking_criteria.must_mention.filter(
                              (_, itemIndex) => itemIndex !== index
                            ),
                          },
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  onClick={() =>
                    setCaseData({
                      ...caseData,
                      marking_criteria: {
                        ...caseData.marking_criteria,
                        must_mention: [...caseData.marking_criteria.must_mention, ""],
                      },
                    })
                  }
                >
                  Add Must Mention
                </Button>
              </div>

              <div>
                <p className="mb-2 text-sm text-slate-500">Critical Fail</p>
                {caseData.marking_criteria.critical_fail.map((item, index) => (
                  <div key={`critical-fail-${index}`} className="mb-2 flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => {
                        const criticalFail = [...caseData.marking_criteria.critical_fail];
                        criticalFail[index] = e.target.value;
                        setCaseData({
                          ...caseData,
                          marking_criteria: {
                            ...caseData.marking_criteria,
                            critical_fail: criticalFail,
                          },
                        });
                      }}
                    />
                    <Button
                      variant="outline"
                      onClick={() =>
                        setCaseData({
                          ...caseData,
                          marking_criteria: {
                            ...caseData.marking_criteria,
                            critical_fail: caseData.marking_criteria.critical_fail.filter(
                              (_, itemIndex) => itemIndex !== index
                            ),
                          },
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  variant="secondary"
                  onClick={() =>
                    setCaseData({
                      ...caseData,
                      marking_criteria: {
                        ...caseData.marking_criteria,
                        critical_fail: [...caseData.marking_criteria.critical_fail, ""],
                      },
                    })
                  }
                >
                  Add Critical Fail
                </Button>
              </div>
            </section>
          </>
        )}

        {activeMode === "Fast and Furious" && (
          <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-slate-800">Fast Questions</h3>
                <p className="text-sm text-slate-500">
                  Use the shared exhibit library and attach the right exhibits to each question.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    fastReady ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {fastReady ? "Ready" : "Needs setup"}
                </span>
                <Button
                  variant="outline"
                  onClick={() => {
                    setCaseData({
                      ...caseData,
                      modes: {
                        ...caseData.modes,
                        fastAndFurious: {
                          ...caseData.modes.fastAndFurious,
                          enabled: true,
                        },
                      },
                    });
                    setFastModeDialogOpen(true);
                  }}
                >
                  Configure Questions
                </Button>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  Questions
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-800">
                  {
                    caseData.modes.fastAndFurious.questions.filter((question) =>
                      question.question.trim()
                    ).length
                  }
                  <span className="ml-1 text-sm font-medium text-slate-500">
                    / {caseData.modes.fastAndFurious.questionCount}
                  </span>
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  Answer Keywords
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-800">
                  {caseData.modes.fastAndFurious.questions.reduce(
                    (count, question) => count + question.answerKeywords.length,
                    0
                  )}
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-[11px] uppercase tracking-[0.14em] text-slate-400">
                  Exhibit Links
                </p>
                <p className="mt-1 text-xl font-semibold text-slate-800">
                  {caseData.modes.fastAndFurious.questions.reduce(
                    (count, question) => count + question.linkedExhibitIds.length,
                    0
                  )}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {caseData.modes.fastAndFurious.questions.map((question, index) => {
                const linkedExhibits = caseData.exhibits.filter((exhibit) =>
                  question.linkedExhibitIds.includes(exhibit.id)
                );

                return (
                  <div key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="text-sm font-semibold text-slate-800">
                          Question {index + 1}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500">
                          {question.answerKeywords.length} keywords, {linkedExhibits.length} linked exhibits
                        </p>
                      </div>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          question.question.trim()
                            ? "bg-emerald-100 text-emerald-700"
                            : "bg-white text-slate-500"
                        }`}
                      >
                        {question.question.trim() ? "Configured" : "Draft"}
                      </span>
                    </div>

                    <Textarea
                      value={question.question}
                      onChange={(e) => updateFastQuestionText(index, e.target.value)}
                      placeholder="Question"
                      className="mt-4 min-h-[96px] bg-white"
                    />

                    <Input
                      value={
                        fastKeywordInputs[question.id] ?? question.answerKeywords.join(", ")
                      }
                      onChange={(e) => updateFastQuestionKeywords(index, e.target.value)}
                      placeholder="Answer keywords separated by commas"
                      className="mt-4 bg-white"
                    />

                    {question.answerKeywords.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        {question.answerKeywords.map((keyword) => (
                          <span
                            key={`${question.id}-${keyword}`}
                            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {linkedExhibits.length > 0 ? (
                        linkedExhibits.map((exhibit) => (
                          <span
                            key={exhibit.id}
                            className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs text-amber-700"
                          >
                            {exhibit.label || "Untitled exhibit"}
                          </span>
                        ))
                      ) : (
                        <span className="text-sm text-slate-500">No exhibits linked yet</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      <FastAndFuriousDialog
        open={fastModeDialogOpen}
        form={caseData}
        onOpenChange={setFastModeDialogOpen}
        onQuestionCountChange={syncFastQuestionCount}
        onQuestionTextChange={updateFastQuestionText}
        onQuestionKeywordsChange={updateFastQuestionKeywords}
        onToggleQuestionExhibit={toggleFastQuestionExhibit}
      />
    </div>
  );
}
