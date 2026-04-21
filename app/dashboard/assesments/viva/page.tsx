"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
} from "@/components/ui/alert-dialog";
import { FastAndFuriousDialog } from "@/components/viva/FastAndFuriousDialog";
import { VivaModeSelector } from "@/components/viva/VivaModeSelector";
import {
  createExhibit,
  createFastQuestion,
  createInitialVivaForm,
  hasConfiguredCalmMode,
  hasConfiguredFastMode,
  normalizeVivaCase,
  toVivaCasePayload,
  type VivaCase,
  type VivaCaseForm,
  type VivaMode,
} from "@/components/viva/types";

export default function AIVivaPage() {
  const router = useRouter();
  const [cases, setCases] = useState<VivaCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fastModeDialogOpen, setFastModeDialogOpen] = useState(false);
  const [uploadingExhibitIndex, setUploadingExhibitIndex] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<VivaMode>("Calm and Composed");
  const [form, setForm] = useState<VivaCaseForm>(createInitialVivaForm());

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/viva-cases");
      const data = await res.json();
      setCases((data.cases || []).map(normalizeVivaCase));
    } catch {
      toast.error("Failed to fetch cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  const resetComposer = () => {
    setForm(createInitialVivaForm());
    setActiveMode("Calm and Composed");
    setFastModeDialogOpen(false);
  };

  const handleSave = async () => {
    if (!form.case.title.trim() || !form.case.stem.trim()) {
      toast.error("Title and stem are required");
      return;
    }

    if (!form.modes.calmAndComposed.enabled && !form.modes.fastAndFurious.enabled) {
      toast.error("Enable at least one mode");
      return;
    }

    if (
      form.modes.fastAndFurious.enabled &&
      !form.modes.fastAndFurious.questions.some((question) => question.question.trim())
    ) {
      toast.error("Add at least one Fast and Furious question");
      return;
    }

    try {
      const res = await fetch("/api/viva-cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(toVivaCasePayload(form)),
      });

      if (!res.ok) throw new Error();

      toast.success("Case created");
      setDialogOpen(false);
      resetComposer();
      fetchCases();
    } catch {
      toast.error("Create failed");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;

    try {
      await fetch(`/api/viva-cases/${deleteId}`, {
        method: "DELETE",
      });

      toast.success("Deleted");
      setDeleteId(null);
      fetchCases();
    } catch {
      toast.error("Delete failed");
    }
  };

  const uploadImage = async (
    event: React.ChangeEvent<HTMLInputElement>,
    exhibitIndex: number
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "viva-cases");

    setUploadingExhibitIndex(exhibitIndex);

    try {
      const res = await fetch("/api/cloudinary-upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error("Upload failed");

      const data = await res.json();
      setForm((prev) => {
        const exhibits = [...prev.exhibits];
        exhibits[exhibitIndex] = { ...exhibits[exhibitIndex], url: data.url };
        return { ...prev, exhibits };
      });
      toast.success("Image uploaded");
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploadingExhibitIndex(null);
    }
  };

  const syncFastQuestionCount = (nextCount: number) => {
    const safeCount = Number.isFinite(nextCount) ? Math.max(1, nextCount) : 1;

    setForm((prev) => {
      const questions = [...prev.modes.fastAndFurious.questions];

      while (questions.length < safeCount) {
        questions.push(createFastQuestion());
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

  const toggleMode = (mode: VivaMode) => {
    setForm((prev) => {
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

    if (mode === "Fast and Furious" && !form.modes.fastAndFurious.enabled) {
      setFastModeDialogOpen(true);
      setActiveMode("Fast and Furious");
    }
  };

  const updateFastQuestion = (questionIndex: number, value: string) => {
    setForm((prev) => {
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
    const answerKeywords = value
      .split(/[,\s]+/)
      .map((keyword) => keyword.trim())
      .filter(Boolean);

    setForm((prev) => {
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
    setForm((prev) => {
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

  const removeExhibit = (exhibitIndex: number) => {
    setForm((prev) => {
      const removedExhibit = prev.exhibits[exhibitIndex];
      const exhibits = prev.exhibits.filter((_, index) => index !== exhibitIndex);
      const questions = prev.modes.fastAndFurious.questions.map((question) => ({
        ...question,
        linkedExhibitIds: question.linkedExhibitIds.filter((id) => id !== removedExhibit.id),
      }));

      return {
        ...prev,
        exhibits,
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

  const calmReady = hasConfiguredCalmMode({ case: form.case, modes: form.modes });
  const fastReady = hasConfiguredFastMode({ modes: form.modes });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">AI Viva Cases</h2>
          <p className="text-sm text-slate-500">
            Shared cases with Calm and Composed and Fast and Furious setups.
          </p>
        </div>

        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetComposer();
          }}
        >
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-teal-600 text-white shadow-sm hover:bg-teal-700">
              <Plus className="mr-2 h-4 w-4" />
              Add Case
            </Button>
          </DialogTrigger>

          <DialogContent className="!w-[80vw] !max-w-[80vw] sm:!max-w-[80vw] overflow-hidden border-0 bg-transparent p-0 shadow-none">
            <div className="mx-auto flex h-[94vh] w-full flex-col overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-2xl">
            <div className="sticky top-0 z-10 border-b bg-white px-8 py-5">
              <DialogHeader>
                <DialogTitle>Create AI Viva Case</DialogTitle>
              </DialogHeader>
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 px-8 py-6">
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-800">Shared Case Details</h3>
                  <p className="text-xs text-slate-500">
                    These details are reused across both viva modes.
                  </p>
                </div>

                <Input
                  placeholder="Case Title"
                  value={form.case.title}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      case: { ...prev.case, title: e.target.value },
                    }))
                  }
                  className="h-11 rounded-xl"
                />

                <select
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  value={form.case.level}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      case: { ...prev.case, level: e.target.value },
                    }))
                  }
                >
                  <option>Beginner</option>
                  <option>Intermediate</option>
                  <option>Advanced</option>
                </select>

                <Textarea
                  placeholder="Clinical Stem"
                  value={form.case.stem}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      case: { ...prev.case, stem: e.target.value },
                    }))
                  }
                  className="min-h-[120px] rounded-xl"
                />
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-800">Allowed Users</h3>
                  <p className="text-xs text-slate-500">
                    Optional emails that can access this case.
                  </p>
                </div>

                <Input
                  placeholder="Add email (Enter)"
                  className="h-11 rounded-xl"
                  onKeyDown={(e) => {
                    if (e.key !== "Enter") return;

                    e.preventDefault();
                    const value = (e.target as HTMLInputElement).value.trim().toLowerCase();
                    if (!value) return;

                    setForm((prev) => ({
                      ...prev,
                      allowedUser: prev.allowedUser.includes(value)
                        ? prev.allowedUser
                        : [...prev.allowedUser, value],
                    }));

                    (e.target as HTMLInputElement).value = "";
                  }}
                />

                {!!form.allowedUser.length && (
                  <div className="flex flex-wrap gap-2">
                    {form.allowedUser.map((email) => (
                      <button
                        key={email}
                        type="button"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            allowedUser: prev.allowedUser.filter((item) => item !== email),
                          }))
                        }
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                      >
                        {email}
                      </button>
                    ))}
                  </div>
                )}
              </section>

              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-800">Shared Exhibit Library</h3>
                    <p className="text-xs text-slate-500">
                      Calm mode uses these directly, and Fast mode can attach them to any question.
                    </p>
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        exhibits: [...prev.exhibits, createExhibit()],
                      }))
                    }
                  >
                    Add Exhibit
                  </Button>
                </div>

                {form.exhibits.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    No exhibits yet. Add shared exhibits once and reuse them across both modes.
                  </div>
                )}

                {form.exhibits.map((exhibit, index) => (
                  <div
                    key={exhibit.id}
                    className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <div className="flex items-start justify-between">
                      <h4 className="text-sm font-medium text-slate-800">Exhibit {index + 1}</h4>
                      <button
                        type="button"
                        onClick={() => removeExhibit(index)}
                        className="rounded p-1 transition hover:bg-red-100"
                      >
                        <X size={16} className="text-red-500" />
                      </button>
                    </div>

                    <Input
                      placeholder="Label"
                      value={exhibit.label}
                      onChange={(e) =>
                        setForm((prev) => {
                          const exhibits = [...prev.exhibits];
                          exhibits[index] = { ...exhibits[index], label: e.target.value };
                          return { ...prev, exhibits };
                        })
                      }
                      className="rounded-xl bg-white"
                    />

                    <label className="block">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => uploadImage(e, index)}
                        disabled={uploadingExhibitIndex === index}
                        className="hidden"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        className="w-full rounded-xl bg-white"
                        disabled={uploadingExhibitIndex === index}
                        onClick={(e) => {
                          e.preventDefault();
                          (
                            e.currentTarget.parentElement?.querySelector(
                              'input[type="file"]'
                            ) as HTMLInputElement
                          )?.click();
                        }}
                      >
                        {uploadingExhibitIndex === index ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Choose Image
                          </>
                        )}
                      </Button>
                    </label>

                    {exhibit.url && (
                      <img
                        src={exhibit.url}
                        alt={exhibit.label || "Exhibit preview"}
                        className="h-40 w-full rounded-xl border object-cover"
                      />
                    )}

                    <Input
                      placeholder="Or paste image URL manually"
                      value={exhibit.url}
                      onChange={(e) =>
                        setForm((prev) => {
                          const exhibits = [...prev.exhibits];
                          exhibits[index] = { ...exhibits[index], url: e.target.value };
                          return { ...prev, exhibits };
                        })
                      }
                      className="rounded-xl bg-white"
                    />

                    <Textarea
                      placeholder="Description"
                      value={exhibit.description}
                      onChange={(e) =>
                        setForm((prev) => {
                          const exhibits = [...prev.exhibits];
                          exhibits[index] = { ...exhibits[index], description: e.target.value };
                          return { ...prev, exhibits };
                        })
                      }
                      className="min-h-[88px] rounded-xl bg-white"
                    />
                  </div>
                ))}
              </section>

              <VivaModeSelector
                activeMode={activeMode}
                calmEnabled={form.modes.calmAndComposed.enabled}
                fastEnabled={form.modes.fastAndFurious.enabled}
                fastQuestionCount={form.modes.fastAndFurious.questionCount}
                onModeSelect={setActiveMode}
                onToggleMode={toggleMode}
                onConfigureFastMode={() => setFastModeDialogOpen(true)}
              />

              {activeMode === "Calm and Composed" && (
                <>
                  <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Calm Objectives</h3>
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          calmReady ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {calmReady ? "Ready" : "Needs setup"}
                      </span>
                    </div>

                    <Input
                      placeholder="Add objective (Enter)"
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;

                        e.preventDefault();
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (!value) return;

                        setForm((prev) => ({
                          ...prev,
                          case: {
                            ...prev.case,
                            objectives: [...prev.case.objectives, value],
                          },
                        }));

                        (e.target as HTMLInputElement).value = "";
                      }}
                      className="h-11 rounded-xl"
                    />

                    {!!form.case.objectives.length && (
                      <div className="flex flex-wrap gap-2">
                        {form.case.objectives.map((objective, index) => (
                          <button
                            key={`${objective}-${index}`}
                            type="button"
                            onClick={() =>
                              setForm((prev) => ({
                                ...prev,
                                case: {
                                  ...prev.case,
                                  objectives: prev.case.objectives.filter(
                                    (_, objectiveIndex) => objectiveIndex !== index
                                  ),
                                },
                              }))
                            }
                            className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                          >
                            {objective}
                          </button>
                        ))}
                      </div>
                    )}
                  </section>

                  <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold text-slate-800">Marking Criteria</h3>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() =>
                          setForm((prev) => ({
                            ...prev,
                            modes: {
                              ...prev.modes,
                              calmAndComposed: { enabled: true },
                            },
                          }))
                        }
                      >
                        Keep Calm Enabled
                      </Button>
                    </div>

                    <Input
                      placeholder="Must mention (Enter)"
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;

                        e.preventDefault();
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (!value) return;

                        setForm((prev) => ({
                          ...prev,
                          marking_criteria: {
                            ...prev.marking_criteria,
                            must_mention: [...prev.marking_criteria.must_mention, value],
                          },
                        }));

                        (e.target as HTMLInputElement).value = "";
                      }}
                      className="h-11 rounded-xl"
                    />

                    <Input
                      placeholder="Critical fail (Enter)"
                      onKeyDown={(e) => {
                        if (e.key !== "Enter") return;

                        e.preventDefault();
                        const value = (e.target as HTMLInputElement).value.trim();
                        if (!value) return;

                        setForm((prev) => ({
                          ...prev,
                          marking_criteria: {
                            ...prev.marking_criteria,
                            critical_fail: [...prev.marking_criteria.critical_fail, value],
                          },
                        }));

                        (e.target as HTMLInputElement).value = "";
                      }}
                      className="h-11 rounded-xl"
                    />
                  </section>
                </>
              )}

              {activeMode === "Fast and Furious" && (
                <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-800">Fast and Furious</h3>
                      <p className="text-xs text-slate-500">
                        Link shared exhibits to whichever question needs them.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded-full px-3 py-1 text-xs ${
                          fastReady ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {fastReady ? "Ready" : "Needs setup"}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setForm((prev) => ({
                            ...prev,
                            modes: {
                              ...prev.modes,
                              fastAndFurious: {
                                ...prev.modes.fastAndFurious,
                                enabled: true,
                              },
                            },
                          }));
                          setFastModeDialogOpen(true);
                        }}
                      >
                        Configure Questions
                      </Button>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5">
                    {form.modes.fastAndFurious.enabled ? (
                      <div className="space-y-3">
                        {form.modes.fastAndFurious.questions.map((question, index) => (
                          <div
                            key={question.id}
                            className="rounded-xl border border-slate-200 bg-white p-4"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-sm font-medium text-slate-800">
                                Question {index + 1}
                              </p>
                              <div className="text-right text-xs text-slate-500">
                                <p>{question.linkedExhibitIds.length} exhibits linked</p>
                                <p>{question.answerKeywords.length} keywords</p>
                              </div>
                            </div>
                            <p className="mt-2 text-sm text-slate-600">
                              {question.question || "No question text yet"}
                            </p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        Fast and Furious is not enabled yet. Turn it on above to set up rapid-fire questions.
                      </p>
                    )}
                  </div>
                </section>
              )}
            </div>

            <div className="sticky bottom-0 z-10 flex justify-end gap-3 border-t bg-white px-8 py-4">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="rounded-xl bg-teal-600 text-white hover:bg-teal-700" onClick={handleSave}>
                Save Case
              </Button>
            </div>
            </div>
          </DialogContent>
        </Dialog>

        <FastAndFuriousDialog
          open={fastModeDialogOpen}
          form={form}
          onOpenChange={setFastModeDialogOpen}
          onQuestionCountChange={syncFastQuestionCount}
          onQuestionTextChange={updateFastQuestion}
          onQuestionKeywordsChange={updateFastQuestionKeywords}
          onToggleQuestionExhibit={toggleFastQuestionExhibit}
        />
      </div>

      {loading && <Loader2 className="mx-auto animate-spin" />}

      <div className="grid gap-6 lg:grid-cols-2">
        {cases.map((vivaCase) => {
          const calmModeReady = hasConfiguredCalmMode(vivaCase);
          const fastModeReady = hasConfiguredFastMode(vivaCase);

          return (
            <Card
              key={vivaCase.id}
              onClick={() => router.push(`/dashboard/assesments/viva/${vivaCase.id}`)}
              className="group relative cursor-pointer overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl"
            >
              <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-teal-400 via-emerald-400 to-amber-400" />

              <CardContent className="space-y-4 p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <p className="font-semibold text-slate-800">{vivaCase.case.title}</p>
                    <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                      {vivaCase.case.level}
                    </span>
                  </div>

                  <div className="rounded-full border border-teal-100 bg-teal-50 px-3 py-1 text-xs font-medium text-teal-700">
                    {vivaCase.attemptsCount || 0} attempted
                  </div>
                </div>

                <p className="line-clamp-3 text-sm leading-relaxed text-slate-600">
                  {vivaCase.case.stem}
                </p>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      calmModeReady
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    Calm: {calmModeReady ? "Ready" : "Not set"}
                  </span>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      fastModeReady
                        ? "border border-amber-200 bg-amber-50 text-amber-700"
                        : "border border-slate-200 bg-slate-50 text-slate-500"
                    }`}
                  >
                    Fast: {fastModeReady ? "Ready" : "Not set"}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-600">
                    {vivaCase.exhibits.length} shared exhibits
                  </span>
                </div>

                <div className="flex items-center justify-between pt-1">
                  <p className="text-sm font-medium text-teal-700">Open case</p>

                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId(vivaCase.id);
                    }}
                    className="rounded-lg p-2 transition hover:bg-red-50"
                  >
                    <Trash2 size={16} className="text-red-500" />
                  </button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl">
          <p className="text-sm text-slate-600">
            Are you sure you want to delete this case?
          </p>

          <div className="mt-4 flex justify-end gap-2">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
