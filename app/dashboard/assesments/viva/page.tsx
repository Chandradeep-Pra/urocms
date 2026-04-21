"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
  AlertDialogContent,
  AlertDialogAction,
  AlertDialogCancel,
} from "@/components/ui/alert-dialog";
import { FastAndFuriousDialog } from "@/components/viva/FastAndFuriousDialog";
import { VivaModeSelector } from "@/components/viva/VivaModeSelector";
import {
  createFastQuestion,
  createInitialVivaForm,
  type VivaCase,
  type VivaCaseForm,
  type VivaMode,
} from "@/components/viva/types";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/* ================= COMPONENT ================= */

export default function AIVivaPage() {
  const [cases, setCases] = useState<VivaCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fastModeDialogOpen, setFastModeDialogOpen] = useState(false);
  const [uploadingExhibitIndex, setUploadingExhibitIndex] = useState<number | null>(null);
  const [uploadingFastQuestionIndex, setUploadingFastQuestionIndex] = useState<number | null>(null);
  const router = useRouter();

  const [form, setForm] = useState<VivaCaseForm>(createInitialVivaForm());

  /* ================= FETCH ================= */

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/viva-cases");
      const data = await res.json();
      setCases(data.cases || []);
    } catch {
      toast.error("Failed to fetch cases");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCases();
  }, []);

  /* ================= CREATE ================= */

  const handleSave = async () => {
    if (!form.case.title || !form.case.stem) {
      toast.error("Title & stem required");
      return;
    }

    if (
      form.mode === "Fast and Furious" &&
      form.fastAndFurious.questionCount < 1
    ) {
      toast.error("Add at least one question for Fast and Furious mode");
      return;
    }

    const payload: VivaCaseForm = {
      ...form,
      case: {
        ...form.case,
        fastAndFuriousQuestions:
          form.mode === "Fast and Furious"
            ? form.fastAndFurious.questions.map((item, index) => ({
                [`question${index + 1}`]: {
                  question: item.question,
                  image: item.imageEnabled
                    ? {
                        imageUrl: item.image.imageUrl || "",
                        imageName: item.image.imageName || "",
                        imageDesc: item.image.imageDesc || "",
                      }
                    : {},
                },
              }))
            : [],
      },
    };

    try {
      const res = await fetch("/api/viva-cases", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      toast.success("Case created");
      setDialogOpen(false);
      setFastModeDialogOpen(false);
      fetchCases();
      setForm(createInitialVivaForm());

    } catch {
      toast.error("Create failed");
    }
  };

  /* ================= DELETE ================= */

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

  /* ================= IMAGE UPLOAD ================= */

  const uploadImage = async (
    e: React.ChangeEvent<HTMLInputElement>,
    onStart: () => void,
    onSuccess: (url: string) => void,
    onComplete: () => void
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "viva-cases");

    onStart();

    try {
      const res = await fetch("/api/cloudinary-upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();
      onSuccess(data.url);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      toast.error("Image upload failed");
      console.error("Upload error:", error);
    } finally {
      onComplete();
    }
  };

  const handleExhibitImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    exhibitIndex: number
  ) => {
    uploadImage(
      e,
      () => setUploadingExhibitIndex(exhibitIndex),
      (url) => {
        setForm((prev) => {
          const updated = [...prev.exhibits];
          updated[exhibitIndex] = { ...updated[exhibitIndex], url };
          return { ...prev, exhibits: updated };
        });
      },
      () => setUploadingExhibitIndex(null)
    );
  };

  const syncFastQuestionCount = (nextCount: number) => {
    const safeCount = Number.isFinite(nextCount) ? Math.max(1, nextCount) : 1;

    setForm((prev) => {
      const currentQuestions = prev.fastAndFurious.questions;
      let nextQuestions = currentQuestions;

      if (safeCount > currentQuestions.length) {
        nextQuestions = [
          ...currentQuestions,
          ...Array.from(
            { length: safeCount - currentQuestions.length },
            (_, offset) => createFastQuestion(currentQuestions.length + offset)
          ),
        ];
      } else if (safeCount < currentQuestions.length) {
        nextQuestions = currentQuestions.slice(0, safeCount);
      }

      return {
        ...prev,
        fastAndFurious: {
          questionCount: safeCount,
          questions: nextQuestions,
        },
      };
    });
  };

  const handleFastQuestionImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    questionIndex: number
  ) => {
    uploadImage(
      e,
      () => setUploadingFastQuestionIndex(questionIndex),
      (url) => {
        setForm((prev) => {
          const questions = [...prev.fastAndFurious.questions];
          questions[questionIndex] = {
            ...questions[questionIndex],
            imageEnabled: true,
            image: {
              ...questions[questionIndex].image,
              imageUrl: url,
            },
          };

          return {
            ...prev,
            fastAndFurious: {
              ...prev.fastAndFurious,
              questions,
            },
          };
        });
      },
      () => setUploadingFastQuestionIndex(null)
    );
  };

  const handleModeChange = (mode: VivaMode) => {
    setForm((prev) => ({ ...prev, mode }));
    if (mode === "Fast and Furious") {
      setFastModeDialogOpen(true);
    }
  };

  const toggleFastQuestionImage = (questionIndex: number) => {
    setForm((prev) => {
      const questions = [...prev.fastAndFurious.questions];
      const current = questions[questionIndex];
      questions[questionIndex] = {
        ...current,
        imageEnabled: !current.imageEnabled,
        image: !current.imageEnabled
          ? current.image
          : {
              ...current.image,
              imageUrl: "",
              imageDesc: "",
            },
      };

      return {
        ...prev,
        fastAndFurious: {
          ...prev.fastAndFurious,
          questions,
        },
      };
    });
  };

  const updateFastQuestionImageField = (
    questionIndex: number,
    field: "imageName" | "imageUrl" | "imageDesc",
    value: string
  ) => {
    setForm((prev) => {
      const questions = [...prev.fastAndFurious.questions];
      questions[questionIndex] = {
        ...questions[questionIndex],
        image: {
          ...questions[questionIndex].image,
          [field]: value,
        },
      };

      return {
        ...prev,
        fastAndFurious: {
          ...prev.fastAndFurious,
          questions,
        },
      };
    });
  };

  const updateFastQuestionText = (questionIndex: number, value: string) => {
    setForm((prev) => {
      const questions = [...prev.fastAndFurious.questions];
      questions[questionIndex] = {
        ...questions[questionIndex],
        question: value,
      };

      return {
        ...prev,
        fastAndFurious: {
          ...prev.fastAndFurious,
          questions,
        },
      };
    });
  };

  const getModeCardStyles = (mode?: VivaMode) => {
    if (mode === "Fast and Furious") {
      return {
        card:
          "border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 hover:border-amber-300",
        badge: "bg-amber-100 text-amber-800 border border-amber-200",
        accent: "from-amber-400 via-orange-400 to-red-400",
        chip: "⚡ Fast and Furious",
        footer: "text-amber-700",
      };
    }

    return {
      card:
        "border-teal-200 bg-gradient-to-br from-teal-50 via-white to-cyan-50 hover:border-teal-300",
      badge: "bg-teal-100 text-teal-800 border border-teal-200",
      accent: "from-teal-400 via-emerald-400 to-cyan-400",
      chip: "🧘 Calm and Composed",
      footer: "text-teal-700",
    };
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">AI Viva Cases</h2>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="rounded-xl bg-teal-600 text-white shadow-sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Case
            </Button>
          </DialogTrigger>

          {/* ================= FULL FORM ================= */}
          <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl">

            <div className="border-b bg-white px-6 py-5">
              <DialogHeader>
                <DialogTitle>✨ Create AI Viva Case</DialogTitle>
              </DialogHeader>
            </div>

            <div className="max-h-[75vh] space-y-6 overflow-y-auto bg-slate-50 px-6 py-6">

              <VivaModeSelector
                mode={form.mode}
                questionCount={form.fastAndFurious.questionCount}
                onModeChange={handleModeChange}
                onConfigureFastMode={() => setFastModeDialogOpen(true)}
              />

              {/* CASE */}
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="space-y-1">
                  <h3 className="text-sm font-semibold text-slate-800">📝 Basic Details</h3>
                </div>
                <Input
                  placeholder="Case Title"
                  value={form.case.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      case: { ...form.case, title: e.target.value },
                    })
                  }
                  className="h-11 rounded-xl"
                />

                <select
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  value={form.case.level}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      case: { ...form.case, level: e.target.value },
                    })
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
                    setForm({
                      ...form,
                      case: { ...form.case, stem: e.target.value },
                    })
                  }
                  className="min-h-[120px] rounded-xl"
                />
              </section>

              {/* OBJECTIVES */}
              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800">🎯 Objectives</h3>
                <Input
                  placeholder="Add objective (Enter)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value;
                      if (!val) return;

                      setForm({
                        ...form,
                        case: {
                          ...form.case,
                          objectives: [...form.case.objectives, val],
                        },
                      });

                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                  className="h-11 rounded-xl"
                />
                {!!form.case.objectives.length && (
                  <div className="flex flex-wrap gap-2">
                    {form.case.objectives.map((objective, index) => (
                      <span
                        key={`${objective}-${index}`}
                        className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700"
                      >
                        {objective}
                      </span>
                    ))}
                  </div>
                )}
              </section>

              {/* EXHIBITS */}
              <section className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-800">🖼 Exhibits</h3>
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                  onClick={() =>
                    setForm({
                      ...form,
                      exhibits: [
                        ...form.exhibits,
                        { label: "", url: "", description: "" },
                      ],
                    })
                  }
                >
                  Add Exhibit
                </Button>
                </div>

                {form.exhibits.map((ex, i) => (
                  <div key={i} className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm text-slate-800">Exhibit {i + 1}</h4>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = form.exhibits.filter((_, idx) => idx !== i);
                          setForm({ ...form, exhibits: updated });
                        }}
                        className="p-1 hover:bg-red-100 rounded transition"
                      >
                        <X size={16} className="text-red-500" />
                      </button>
                    </div>

                    <Input
                      placeholder="Label"
                      value={ex.label}
                      onChange={(e) => {
                        const updated = [...form.exhibits];
                        updated[i].label = e.target.value;
                        setForm({ ...form, exhibits: updated });
                      }}
                      className="rounded-xl bg-white"
                    />

                    {/* IMAGE UPLOAD SECTION */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700">🖼 Upload Image</p>
                      <div className="flex gap-2">
                        <label className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleExhibitImageUpload(e, i)}
                            disabled={uploadingExhibitIndex === i}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full rounded-xl bg-white"
                            disabled={uploadingExhibitIndex === i}
                            onClick={(e) => {
                              e.preventDefault();
                              (e.currentTarget.parentElement?.querySelector('input[type="file"]') as HTMLInputElement)?.click();
                            }}
                          >
                            {uploadingExhibitIndex === i ? (
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
                      </div>
                    </div>

                    {/* IMAGE PREVIEW */}
                    {ex.url && (
                      <div className="relative group">
                        <img
                          src={ex.url}
                          alt={ex.label || "Preview"}
                          className="w-full h-40 object-cover rounded border border-slate-200"
                        />
                        <button
                          onClick={() => {
                            const updated = [...form.exhibits];
                            updated[i].url = "";
                            setForm({ ...form, exhibits: updated });
                          }}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    {/* MANUAL URL INPUT */}
                    <Input
                      placeholder="Or paste image URL manually"
                      value={ex.url}
                      onChange={(e) => {
                        const updated = [...form.exhibits];
                        updated[i].url = e.target.value;
                        setForm({ ...form, exhibits: updated });
                      }}
                      className="rounded-xl bg-white"
                    />

                    <Textarea
                      placeholder="Description"
                      value={ex.description}
                      onChange={(e) => {
                        const updated = [...form.exhibits];
                        updated[i].description = e.target.value;
                        setForm({ ...form, exhibits: updated });
                      }}
                      className="min-h-[88px] rounded-xl bg-white"
                    />
                  </div>
                ))}
              </section>

              {/* MARKING */}
              <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-sm font-semibold text-slate-800">✅ Marking</h3>
                <Input
                  placeholder="Must mention (Enter)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value;

                      setForm({
                        ...form,
                        marking_criteria: {
                          ...form.marking_criteria,
                          must_mention: [
                            ...form.marking_criteria.must_mention,
                            val,
                          ],
                        },
                      });

                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                  className="h-11 rounded-xl"
                />

                <Input
                  placeholder="Critical fail (Enter)"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const val = (e.target as HTMLInputElement).value;

                      setForm({
                        ...form,
                        marking_criteria: {
                          ...form.marking_criteria,
                          critical_fail: [
                            ...form.marking_criteria.critical_fail,
                            val,
                          ],
                        },
                      });

                      (e.target as HTMLInputElement).value = "";
                    }
                  }}
                  className="h-11 rounded-xl"
                />
              </section>

            </div>

            <div className="flex justify-end gap-3 border-t bg-white px-6 py-4">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button className="rounded-xl bg-teal-600 text-white hover:bg-teal-700" onClick={handleSave}>
                Save Case
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <FastAndFuriousDialog
          open={fastModeDialogOpen}
          form={form}
          uploadingQuestionIndex={uploadingFastQuestionIndex}
          onOpenChange={setFastModeDialogOpen}
          onQuestionCountChange={syncFastQuestionCount}
          onQuestionTextChange={updateFastQuestionText}
          onToggleQuestionImage={toggleFastQuestionImage}
          onQuestionImageUpload={handleFastQuestionImageUpload}
          onQuestionImageLabelChange={(questionIndex, value) =>
            updateFastQuestionImageField(questionIndex, "imageName", value)
          }
          onQuestionImageUrlChange={(questionIndex, value) =>
            updateFastQuestionImageField(questionIndex, "imageUrl", value)
          }
          onQuestionImageDescriptionChange={(questionIndex, value) =>
            updateFastQuestionImageField(questionIndex, "imageDesc", value)
          }
          onQuestionImageRemove={(questionIndex) =>
            updateFastQuestionImageField(questionIndex, "imageUrl", "")
          }
        />
      </div>

      {/* LOADING */}
      {loading && <Loader2 className="animate-spin mx-auto" />}

      {/* GRID */}
      <div className="grid lg:grid-cols-2 gap-6">
  {cases.map((c) => {
    const modeStyles = getModeCardStyles(c.mode);
    const fastQuestionCount = c.case.fastAndFuriousQuestions?.length ?? 0;

    return (
      <Card
        key={c.id}
        onClick={() => {
  router.push(`viva/${c.id}`);
}}
        className={`
          group relative cursor-pointer overflow-hidden rounded-2xl bg-white
          transition-all duration-300 transform will-change-transform
          hover:-translate-y-1 hover:scale-[1.01]
          border shadow-sm hover:shadow-xl ${modeStyles.card}
        `}
      >
        <div
          className={`absolute inset-x-0 top-0 h-1 bg-gradient-to-r ${modeStyles.accent}`}
        />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/50 pointer-events-none" />

        <CardContent className="relative p-6 space-y-4">

          {/* HEADER */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${modeStyles.badge}`}>
                {modeStyles.chip}
              </span>
              <p className="font-semibold text-slate-800 leading-snug">
                {c.case.title}
              </p>

              <span className="inline-flex text-[11px] px-2 py-0.5 rounded-full bg-white/80 text-slate-600 border border-slate-200">
                {c.case.level}
              </span>
            </div>

            {/* BADGE */}
            <div className="text-xs font-medium px-3 py-1 rounded-full bg-teal-50 text-teal-700 border border-teal-100">
              {c.attemptsCount || 0} attempted
            </div>
          </div>

          {/* STEM */}
          <p className="text-sm text-slate-600 leading-relaxed line-clamp-3">
            {c.case.stem}
          </p>

          <div className="flex flex-wrap gap-2">
            {c.mode === "Fast and Furious" ? (
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs text-amber-700 border border-amber-200">
                {fastQuestionCount} questions
              </span>
            ) : (
              <span className="rounded-full bg-white/90 px-3 py-1 text-xs text-teal-700 border border-teal-200">
                {c.exhibits?.length || 0} exhibits
              </span>
            )}
          </div>

          {/* FOOTER */}
          <div className="flex justify-between items-center pt-1">

            <div className={`flex items-center gap-1.5 text-sm font-medium ${modeStyles.footer}`}>
              View details
            </div>

            {/* DELETE */}
            <button
              onClick={(e) => {
                e.stopPropagation(); // prevent card click
                setDeleteId(c.id);
              }}
              className="p-2 rounded-lg hover:bg-red-50 transition"
            >
              <Trash2 size={16} className="text-red-500" />
            </button>
          </div>

        </CardContent>
      </Card>
    );
  })}
</div>

{/* DELETE */}
<AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
  <AlertDialogContent className="rounded-xl">
    <p className="text-sm text-slate-600">
      Are you sure you want to delete this case?
    </p>

    <div className="flex justify-end gap-2 mt-4">
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
