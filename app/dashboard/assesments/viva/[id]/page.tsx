"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import type { VivaCase, VivaMode } from "@/components/viva/types";
import { toast } from "sonner";

type FastQuestionEntry = NonNullable<VivaCase["case"]["fastAndFuriousQuestions"]>[number];

export default function CaseDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [caseData, setCaseData] = useState<VivaCase | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCase = async () => {
    try {
      const res = await fetch(`/api/viva-cases/${id}`);
      const data = await res.json();
      setCaseData(data.case);
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
    try {
      const res = await fetch(`/api/viva-cases/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(caseData),
      });

      const data = await res.json();

      if (!res.ok) {
        console.error(data);
        throw new Error(data?.error || "Update failed");
      }

      toast.success("Case updated successfully");
    } catch (err: any) {
      console.error(err);
      toast.error(err.message || "Update failed");
    }
  };

  const getModeStyles = (mode?: VivaMode) => {
    if (mode === "Fast and Furious") {
      return {
        page: "from-amber-50 via-white to-orange-50",
        badge: "bg-amber-100 text-amber-800 border border-amber-200",
        button: "bg-amber-500 hover:bg-amber-600 text-white",
        section: "border-amber-200",
        questionCard: "border-amber-200 bg-amber-50/60",
        label: "⚡ Fast and Furious",
      };
    }

    return {
      page: "from-teal-50 via-white to-cyan-50",
      badge: "bg-teal-100 text-teal-800 border border-teal-200",
      button: "bg-teal-600 hover:bg-teal-700 text-white",
      section: "border-slate-200",
      questionCard: "border-slate-200 bg-slate-50",
      label: "🧘 Calm and Composed",
    };
  };

  const updateFastQuestion = (
    index: number,
    field: "question" | "imageUrl" | "imageName" | "imageDesc",
    value: string
  ) => {
    if (!caseData?.case.fastAndFuriousQuestions) return;

    const updatedQuestions = [...caseData.case.fastAndFuriousQuestions];
    const currentQuestion = updatedQuestions[index];
    const questionKey = Object.keys(currentQuestion || {})[0];

    if (!questionKey) return;

    const currentValue = currentQuestion[questionKey];
    updatedQuestions[index] = {
      [questionKey]:
        field === "question"
          ? {
              ...currentValue,
              question: value,
            }
          : {
              ...currentValue,
              image: {
                ...currentValue.image,
                [field]: value,
              },
            },
    };

    setCaseData({
      ...caseData,
      case: {
        ...caseData.case,
        fastAndFuriousQuestions: updatedQuestions,
      },
    });
  };

  if (loading) return <p className="mt-10 text-center">Loading...</p>;
  if (!caseData) return <p>No data found</p>;

  const isFastMode = caseData.mode === "Fast and Furious";
  const fastQuestions = caseData.case.fastAndFuriousQuestions ?? [];
  const styles = getModeStyles(caseData.mode);

  return (
    <div className={`min-h-screen bg-gradient-to-br ${styles.page}`}>
      <div className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-5xl space-y-3 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.back()}
                className="rounded-lg p-2 transition hover:bg-slate-100"
              >
                <ArrowLeft className="h-4 w-4 text-slate-600" />
              </button>

              <input
                value={caseData.case.title}
                onChange={(e) =>
                  setCaseData({
                    ...caseData,
                    case: { ...caseData.case, title: e.target.value },
                  })
                }
                className="border-none bg-transparent text-xl font-semibold text-slate-900 outline-none placeholder:text-slate-400 focus:ring-0"
                placeholder="Untitled Case"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                {caseData.case.level}
              </span>
              <span className={`rounded-full px-3 py-1 text-xs ${styles.badge}`}>
                {styles.label}
              </span>
              <Button onClick={handleUpdate} className={`px-5 ${styles.button}`}>
                Save
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4 pl-11 text-xs text-slate-500">
            <span>{isFastMode ? "Fast case" : "Calm case"}</span>
            <span className="h-3 w-px bg-slate-300" />
            <span>ID: {id}</span>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl space-y-8 p-6">
        <div className={`space-y-4 rounded-2xl border bg-white p-6 shadow-sm ${styles.section}`}>
          <h3 className="font-semibold text-slate-700">
            {isFastMode ? "⚡ Fast Case Details" : "📝 Case Details"}
          </h3>

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
        </div>

        <div className={`space-y-4 rounded-2xl border bg-white p-6 shadow-sm ${styles.section}`}>
          <h3 className="font-semibold text-slate-700">Allowed Users</h3>

          {caseData.allowedUser?.map((email: string, i: number) => (
            <div key={i} className="flex gap-2">
              <Input
                value={email}
                onChange={(e) => {
                  const updated = [...caseData.allowedUser];
                  updated[i] = e.target.value.toLowerCase();
                  setCaseData({ ...caseData, allowedUser: updated });
                }}
                placeholder="Enter email"
              />

              <Button
                variant="outline"
                onClick={() => {
                  const updated = caseData.allowedUser.filter(
                    (_: string, index: number) => index !== i
                  );
                  setCaseData({ ...caseData, allowedUser: updated });
                }}
              >
                Remove
              </Button>
            </div>
          ))}

          <Button
            variant="secondary"
            onClick={() => {
              setCaseData({
                ...caseData,
                allowedUser: [...(caseData.allowedUser || []), ""],
              });
            }}
          >
            + Add Email
          </Button>
        </div>

        {!isFastMode && (
          <>
            <div className={`space-y-4 rounded-2xl border bg-white p-6 shadow-sm ${styles.section}`}>
              <h3 className="font-semibold text-slate-700">🎯 Objectives</h3>

              {caseData.case.objectives.map((obj: string, i: number) => (
                <Input
                  key={i}
                  value={obj}
                  onChange={(e) => {
                    const updated = [...caseData.case.objectives];
                    updated[i] = e.target.value;
                    setCaseData({
                      ...caseData,
                      case: { ...caseData.case, objectives: updated },
                    });
                  }}
                />
              ))}
            </div>

            <div className={`space-y-6 rounded-2xl border bg-white p-6 shadow-sm ${styles.section}`}>
              <h3 className="font-semibold text-slate-700">🖼 Exhibits</h3>

              {caseData.exhibits.map((ex, i: number) => (
                <div key={i} className="space-y-4 rounded-xl border bg-slate-50 p-4">
                  <Input
                    value={ex.label}
                    onChange={(e) => {
                      const updated = [...caseData.exhibits];
                      updated[i].label = e.target.value;
                      setCaseData({ ...caseData, exhibits: updated });
                    }}
                    placeholder="Label"
                  />

                  {ex.url && (
                    <div className="relative">
                      <img
                        src={ex.url}
                        alt="Exhibit"
                        className="max-h-72 w-full rounded-lg border object-cover"
                      />
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Input
                      value={ex.url}
                      onChange={(e) => {
                        const updated = [...caseData.exhibits];
                        updated[i].url = e.target.value;
                        setCaseData({ ...caseData, exhibits: updated });
                      }}
                      placeholder="Image URL"
                    />

                    {ex.url && (
                      <a
                        href={ex.url}
                        target="_blank"
                        className="flex items-center justify-center rounded-lg border px-3 hover:bg-slate-100"
                      >
                        <ExternalLink size={16} />
                      </a>
                    )}
                  </div>

                  <Textarea
                    value={ex.description}
                    onChange={(e) => {
                      const updated = [...caseData.exhibits];
                      updated[i].description = e.target.value;
                      setCaseData({ ...caseData, exhibits: updated });
                    }}
                    placeholder="Description"
                  />
                </div>
              ))}
            </div>
          </>
        )}

        {isFastMode && (
          <div className={`space-y-6 rounded-2xl border bg-white p-6 shadow-sm ${styles.section}`}>
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-700">⚡ Fast Questions</h3>
              <span className={`rounded-full px-3 py-1 text-xs ${styles.badge}`}>
                {fastQuestions.length} questions
              </span>
            </div>

            {fastQuestions.map((questionItem: FastQuestionEntry, index: number) => {
              const questionKey = Object.keys(questionItem)[0];
              const questionData = questionItem[questionKey];

              return (
                <div
                  key={questionKey}
                  className={`space-y-4 rounded-2xl border p-5 ${styles.questionCard}`}
                >
                  <h4 className="text-sm font-semibold text-slate-800">
                    Question {index + 1}
                  </h4>

                  <Textarea
                    value={questionData.question}
                    onChange={(e) =>
                      updateFastQuestion(index, "question", e.target.value)
                    }
                    placeholder="Question"
                    className="min-h-[96px] bg-white"
                  />

                  <div className="grid gap-4 md:grid-cols-2">
                    <Input
                      value={questionData.image?.imageName || ""}
                      onChange={(e) =>
                        updateFastQuestion(index, "imageName", e.target.value)
                      }
                      placeholder="Image name"
                      className="bg-white"
                    />

                    <div className="flex gap-2">
                      <Input
                        value={questionData.image?.imageUrl || ""}
                        onChange={(e) =>
                          updateFastQuestion(index, "imageUrl", e.target.value)
                        }
                        placeholder="Image URL"
                        className="bg-white"
                      />

                      {questionData.image?.imageUrl && (
                        <a
                          href={questionData.image.imageUrl}
                          target="_blank"
                          className="flex items-center justify-center rounded-lg border px-3 hover:bg-white"
                        >
                          <ExternalLink size={16} />
                        </a>
                      )}
                    </div>
                  </div>

                  {questionData.image?.imageUrl && (
                    <img
                      src={questionData.image.imageUrl}
                      alt={questionData.image.imageName || `Question ${index + 1}`}
                      className="max-h-72 w-full rounded-xl border object-cover"
                    />
                  )}

                  <Textarea
                    value={questionData.image?.imageDesc || ""}
                    onChange={(e) =>
                      updateFastQuestion(index, "imageDesc", e.target.value)
                    }
                    placeholder="Image description"
                    className="min-h-[88px] bg-white"
                  />
                </div>
              );
            })}
          </div>
        )}

        <div className={`space-y-4 rounded-2xl border bg-white p-6 shadow-sm ${styles.section}`}>
          <h3 className="font-semibold text-slate-700">✅ Marking Criteria</h3>

          <div>
            <p className="mb-2 text-sm text-slate-500">Must Mention</p>
            {caseData.marking_criteria.must_mention.map((item: string, i: number) => (
              <Input
                key={i}
                value={item}
                onChange={(e) => {
                  const updated = [...caseData.marking_criteria.must_mention];
                  updated[i] = e.target.value;
                  setCaseData({
                    ...caseData,
                    marking_criteria: {
                      ...caseData.marking_criteria,
                      must_mention: updated,
                    },
                  });
                }}
                className="mb-2"
              />
            ))}
          </div>

          <div>
            <p className="mb-2 text-sm text-slate-500">Critical Fail</p>
            {caseData.marking_criteria.critical_fail.map((item: string, i: number) => (
              <Input
                key={i}
                value={item}
                onChange={(e) => {
                  const updated = [...caseData.marking_criteria.critical_fail];
                  updated[i] = e.target.value;
                  setCaseData({
                    ...caseData,
                    marking_criteria: {
                      ...caseData.marking_criteria,
                      critical_fail: updated,
                    },
                  });
                }}
                className="mb-2"
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
