"use client";

import { useEffect, useState } from "react";
import { FileText, Folder, FolderOpen, FolderPlus, Loader2, Plus, Trash2, Upload, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { adminFetch } from "@/lib/client/adminApi";
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
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { VivaQuestionSetupDialog } from "@/components/viva/VivaQuestionSetupDialog";
import { VivaModeSelector } from "@/components/viva/VivaModeSelector";
import { VivaEditorTabList, type VivaEditorTab } from "@/components/viva/VivaEditorTabList";
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

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export default function AIVivaPage() {
  const router = useRouter();
  const [folders, setFolders] = useState<{ id: string; title: string; description?: string }[]>([]);
  const [cases, setCases] = useState<VivaCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [folderDialogOpen, setFolderDialogOpen] = useState(false);
  const [folderDeleteTarget, setFolderDeleteTarget] = useState<{
    id: string;
    title: string;
    count: number;
  } | null>(null);
  const [fastModeDialogOpen, setFastModeDialogOpen] = useState(false);
  const [calmModeDialogOpen, setCalmModeDialogOpen] = useState(false);
  const [uploadingExhibitIndex, setUploadingExhibitIndex] = useState<number | null>(null);
  const [activeMode, setActiveMode] = useState<VivaMode>("Calm and Composed");
  const [editorTab, setEditorTab] = useState<VivaEditorTab>("details");
  const [activeFolderId, setActiveFolderId] = useState<"all" | "unfoldered" | string>("all");
  const [form, setForm] = useState<VivaCaseForm>(createInitialVivaForm());
  const [folderForm, setFolderForm] = useState({ title: "", description: "" });

  const fetchFolders = async () => {
    try {
      const res = await adminFetch("/api/viva-folders");
      const data = await res.json();
      setFolders(data.folders || []);
    } catch {
      toast.error("Failed to fetch folders");
    }
  };

  const fetchCases = async () => {
    try {
      setLoading(true);
      const res = await adminFetch("/api/viva-cases");
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
    fetchFolders();
  }, []);

  const resetComposer = () => {
    setForm(createInitialVivaForm());
    setActiveMode("Calm and Composed");
    setFastModeDialogOpen(false);
    setCalmModeDialogOpen(false);
    setEditorTab("details");
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
      form.modes.calmAndComposed.enabled &&
      !form.modes.calmAndComposed.questions.some((question) => question.question.trim())
    ) {
      toast.error("Add at least one Calm and Composed question");
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
      const res = await adminFetch("/api/viva-cases", {
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
      await adminFetch(`/api/viva-cases/${deleteId}`, {
        method: "DELETE",
      });

      toast.success("Deleted");
      setDeleteId(null);
      fetchCases();
    } catch {
      toast.error("Delete failed");
    }
  };

  const handleCreateFolder = async () => {
    const title = folderForm.title.trim();

    if (!title) {
      toast.error("Folder title is required");
      return;
    }

    try {
      const res = await adminFetch("/api/viva-folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(folderForm),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create folder");
      }

      toast.success("Folder created");
      setFolderDialogOpen(false);
      setFolderForm({ title: "", description: "" });
      fetchFolders();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to create folder"));
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderDeleteTarget) return;

    try {
      const res = await adminFetch(
        `/api/viva-folders?id=${encodeURIComponent(folderDeleteTarget.id)}`,
        {
          method: "DELETE",
        }
      );
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete folder");
      }

      toast.success(
        data?.movedCount
          ? `Folder deleted. ${data.movedCount} viva set${data.movedCount === 1 ? "" : "s"} moved to Unfoldered.`
          : "Folder deleted"
      );
      if (activeFolderId === folderDeleteTarget.id) {
        setActiveFolderId("unfoldered");
      }
      setFolderDeleteTarget(null);
      await Promise.all([fetchFolders(), fetchCases()]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to delete folder"));
    }
  };

  const handleMoveCaseToFolder = async (caseId: string, folderId: string) => {
    const folder = folders.find((item) => item.id === folderId);

    try {
      const res = await adminFetch(`/api/viva-cases/${caseId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          folderId,
          folderName: folder?.title || "",
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to move case");
      }

      toast.success(folderId ? "Case moved to folder" : "Case moved out of folder");
      fetchCases();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error, "Failed to move case"));
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

  const updateCalmMode = (
    updater: (questions: VivaCaseForm["modes"]["calmAndComposed"]["questions"]) => VivaCaseForm["modes"]["calmAndComposed"]["questions"],
    questionCount?: number
  ) => setForm((prev) => ({
    ...prev,
    modes: {
      ...prev.modes,
      calmAndComposed: {
        ...prev.modes.calmAndComposed,
        ...(questionCount === undefined ? {} : { questionCount }),
        questions: updater([...prev.modes.calmAndComposed.questions]),
      },
    },
  }));

  const syncCalmQuestionCount = (nextCount: number) => {
    const safeCount = Number.isFinite(nextCount) ? Math.max(1, nextCount) : 1;
    updateCalmMode((questions) => {
      while (questions.length < safeCount) questions.push(createFastQuestion());
      return questions.slice(0, safeCount);
    }, safeCount);
  };

  const updateCalmQuestion = (index: number, value: string) =>
    updateCalmMode((questions) => {
      questions[index] = { ...questions[index], question: value };
      return questions;
    });

  const updateCalmQuestionKeywords = (index: number, value: string) =>
    updateCalmMode((questions) => {
      questions[index] = {
        ...questions[index],
        answerKeywords: value.split(",").map((item) => item.trim()).filter(Boolean),
      };
      return questions;
    });

  const toggleCalmQuestionExhibit = (index: number, exhibitId: string) =>
    updateCalmMode((questions) => {
      const question = questions[index];
      questions[index] = {
        ...question,
        linkedExhibitIds: question.linkedExhibitIds.includes(exhibitId)
          ? question.linkedExhibitIds.filter((id) => id !== exhibitId)
          : [...question.linkedExhibitIds, exhibitId],
      };
      return questions;
    });

  const toggleMode = (mode: VivaMode) => {
    setForm((prev) => {
      if (mode === "Calm and Composed") {
        return {
          ...prev,
          modes: {
            ...prev.modes,
            calmAndComposed: {
              ...prev.modes.calmAndComposed,
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
    if (mode === "Calm and Composed" && !form.modes.calmAndComposed.enabled) {
      setCalmModeDialogOpen(true);
      setActiveMode("Calm and Composed");
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
      .split(",")
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

  const applyGeneratedQuestions = (
    modeKey: "calmAndComposed" | "fastAndFurious",
    generated: Array<{ question: string; answerKeywords: string[]; linkedExhibitIds: string[] }>
  ) => setForm((prev) => {
    const current = prev.modes[modeKey].questions;
    const questions = generated.map((item, index) => ({
      ...(current[index] || createFastQuestion()),
      question: item.question,
      answerKeywords: item.answerKeywords,
      linkedExhibitIds: item.linkedExhibitIds,
    }));
    return {
      ...prev,
      modes: {
        ...prev.modes,
        [modeKey]: { ...prev.modes[modeKey], questionCount: questions.length, questions },
      },
    };
  });

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
          calmAndComposed: {
            ...prev.modes.calmAndComposed,
            questions: prev.modes.calmAndComposed.questions.map((question) => ({
              ...question,
              linkedExhibitIds: question.linkedExhibitIds.filter((id) => id !== removedExhibit.id),
            })),
          },
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
  const folderNodes = [
    {
      id: "all",
      title: "All Cases",
      count: cases.length,
      canDelete: false,
    },
    {
      id: "unfoldered",
      title: "Unfoldered",
      count: cases.filter((item) => !item.folderId).length,
      canDelete: false,
    },
    ...folders.map((folder) => ({
      id: folder.id,
      title: folder.title,
      count: cases.filter((item) => item.folderId === folder.id).length,
      canDelete: true,
    })),
  ];
  const visibleCases = cases.filter((item) => {
    if (activeFolderId === "all") return true;
    if (activeFolderId === "unfoldered") return !item.folderId;
    return item.folderId === activeFolderId;
  });
  const activeFolderLabel =
    folderNodes.find((node) => node.id === activeFolderId)?.title || "All Cases";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">AI Viva Cases</h2>
          <p className="text-sm text-slate-500">
            Shared cases with Calm and Composed and Fast and Furious setups.
          </p>
        </div>
        <div className="flex items-center gap-3">
        <Dialog open={folderDialogOpen} onOpenChange={setFolderDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="rounded-xl">
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Folder
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl">
            <DialogHeader>
              <DialogTitle>Create Viva Folder</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <Input
                placeholder="Folder title"
                value={folderForm.title}
                onChange={(e) =>
                  setFolderForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
              <Textarea
                placeholder="Description (optional)"
                value={folderForm.description}
                onChange={(e) =>
                  setFolderForm((prev) => ({ ...prev, description: e.target.value }))
                }
              />
              <div className="flex justify-end">
                <Button onClick={handleCreateFolder}>Create Folder</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

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

            <div className="border-b border-slate-200 bg-slate-50 px-8 py-4">
              <VivaEditorTabList value={editorTab} onValueChange={setEditorTab} />
            </div>

            <div className="flex-1 space-y-6 overflow-y-auto bg-slate-50 px-8 py-6">
              <section className={`${editorTab === "details" ? "" : "hidden"} space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
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
                  value={form.folderId || ""}
                  onChange={(e) => {
                    const selectedFolder = folders.find((folder) => folder.id === e.target.value);
                    setForm((prev) => ({
                      ...prev,
                      folderId: e.target.value,
                      folderName: selectedFolder?.title || "",
                    }));
                  }}
                >
                  <option value="">Unfoldered</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.title}
                    </option>
                  ))}
                </select>

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

                <select
                  className="h-11 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none"
                  value={form.accessType || "restricted"}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      accessType: e.target.value === "public" ? "public" : "restricted",
                    }))
                  }
                >
                  <option value="restricted">Restricted access</option>
                  <option value="public">Public access</option>
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

              <section className={`${editorTab === "details" ? "" : "hidden"} space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
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

              {editorTab === "usage" && (
                <section className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
                  <div className="mx-auto max-w-md space-y-2">
                    <h3 className="font-semibold text-slate-800">Viva use starts after publishing</h3>
                    <p className="text-sm text-slate-500">
                      Attempts, completion and score progress will appear here after this case is saved and used by candidates.
                    </p>
                  </div>
                </section>
              )}

              <section className={`${editorTab === "images" ? "" : "hidden"} space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm`}>
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

              <div className={editorTab === "questions" ? "space-y-6" : "hidden"}>
              <VivaModeSelector
                activeMode={activeMode}
                calmEnabled={form.modes.calmAndComposed.enabled}
                calmQuestionCount={form.modes.calmAndComposed.questionCount}
                fastEnabled={form.modes.fastAndFurious.enabled}
                fastQuestionCount={form.modes.fastAndFurious.questionCount}
                onModeSelect={setActiveMode}
                onToggleMode={toggleMode}
                onConfigureFastMode={() => setFastModeDialogOpen(true)}
                onConfigureCalmMode={() => setCalmModeDialogOpen(true)}
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
                              calmAndComposed: {
                                ...prev.modes.calmAndComposed,
                                enabled: true,
                              },
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
        </div>

      <VivaQuestionSetupDialog
        mode="calmAndComposed"
        open={calmModeDialogOpen}
        form={form}
        onOpenChange={setCalmModeDialogOpen}
        onQuestionCountChange={syncCalmQuestionCount}
        onQuestionTextChange={updateCalmQuestion}
        onQuestionKeywordsChange={updateCalmQuestionKeywords}
        onToggleQuestionExhibit={toggleCalmQuestionExhibit}
        onQuestionsGenerated={(questions) => applyGeneratedQuestions("calmAndComposed", questions)}
      />

      <VivaQuestionSetupDialog
        open={fastModeDialogOpen}
          form={form}
          onOpenChange={setFastModeDialogOpen}
          onQuestionCountChange={syncFastQuestionCount}
          onQuestionTextChange={updateFastQuestion}
          onQuestionKeywordsChange={updateFastQuestionKeywords}
        onToggleQuestionExhibit={toggleFastQuestionExhibit}
        onQuestionsGenerated={(questions) => applyGeneratedQuestions("fastAndFurious", questions)}
        />
      </div>

      {loading && <Loader2 className="mx-auto animate-spin" />}

      <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="rounded-3xl border border-slate-200 bg-white p-3 shadow-sm">
          <div className="border-b border-slate-100 px-3 pb-3">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
              Viva Explorer
            </p>
          </div>
          <div className="mt-3 space-y-1">
            {folderNodes.map((node) => {
              const active = activeFolderId === node.id;
              const isFolder = node.id !== "all";
              const FolderIcon =
                active && isFolder ? FolderOpen : isFolder ? Folder : FileText;

              return (
                <div
                  key={node.id}
                  className={`group flex w-full items-center gap-2 rounded-2xl px-2 py-2 transition ${
                    active
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <button
                    type="button"
                    onClick={() =>
                      setActiveFolderId(node.id as "all" | "unfoldered" | string)
                    }
                    className="flex min-w-0 flex-1 items-center gap-3 rounded-xl px-1 py-1 text-left"
                  >
                    <FolderIcon className="h-4 w-4 shrink-0" />
                    <span className="truncate text-sm font-medium">{node.title}</span>
                  </button>

                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500 shadow-sm">
                    {node.count}
                  </span>

                  {node.canDelete ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setFolderDeleteTarget({
                          id: node.id,
                          title: node.title,
                          count: node.count,
                        });
                      }}
                      aria-label={`Delete ${node.title}`}
                      className="rounded-lg p-1.5 text-slate-300 opacity-0 transition hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>
        </aside>

        <section className="space-y-4">
          <div className="flex items-center justify-between rounded-3xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <div className="flex items-center gap-3">
              <FolderOpen className="h-5 w-5 text-teal-600" />
              <div>
                <h3 className="text-base font-semibold text-slate-900">{activeFolderLabel}</h3>
                <p className="text-sm text-slate-500">
                  {visibleCases.length} case{visibleCases.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
          </div>

          {visibleCases.length === 0 ? (
            <div className="grid min-h-[260px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
              <div className="space-y-3">
                <Folder className="mx-auto h-10 w-10 text-slate-300" />
                <div>
                  <h4 className="text-base font-semibold text-slate-900">No viva cases here</h4>
                  <p className="mt-1 text-sm text-slate-500">
                    Select another folder or create a new case in this location.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-6 lg:grid-cols-2">
        {visibleCases.map((vivaCase) => {
          const calmModeReady = hasConfiguredCalmMode(vivaCase);
          const fastModeReady = hasConfiguredFastMode(vivaCase);
          const configuredFastQuestions = vivaCase.modes.fastAndFurious.questions.filter(
            (question) => question.question.trim().length > 0
          );
          const totalFastKeywords = vivaCase.modes.fastAndFurious.questions.reduce(
            (count, question) => count + question.answerKeywords.length,
            0
          );
          const totalFastExhibits = vivaCase.modes.fastAndFurious.questions.reduce(
            (count, question) => count + question.linkedExhibitIds.length,
            0
          );
          const firstFastQuestion = configuredFastQuestions[0];

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
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-slate-400" />
                      <p className="font-semibold text-slate-800">{vivaCase.case.title}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <span className="inline-flex rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] text-slate-600">
                        {vivaCase.case.level}
                      </span>
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-[11px] ${
                          vivaCase.accessType === "public"
                            ? "border border-sky-200 bg-sky-50 text-sky-700"
                            : "border border-slate-200 bg-slate-50 text-slate-600"
                        }`}
                      >
                        {vivaCase.accessType === "public" ? "Public" : "Restricted"}
                      </span>
                      {vivaCase.folderName ? (
                        <span className="inline-flex rounded-full border border-teal-100 bg-teal-50 px-2 py-0.5 text-[11px] text-teal-700">
                          {vivaCase.folderName}
                        </span>
                      ) : null}
                    </div>
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

                {fastModeReady && (
                  <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-amber-900">
                        Fast and Furious
                      </p>
                      <p className="text-xs text-amber-700">
                        {configuredFastQuestions.length}/{vivaCase.modes.fastAndFurious.questionCount} questions ready
                      </p>
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs text-amber-700">
                        {totalFastKeywords} keywords
                      </span>
                      <span className="rounded-full border border-amber-200 bg-white px-3 py-1 text-xs text-amber-700">
                        {totalFastExhibits} exhibit links
                      </span>
                    </div>

                    {firstFastQuestion && (
                      <div className="mt-3 rounded-xl border border-white/80 bg-white/80 p-3">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-700">
                          First Question
                        </p>
                        <p className="mt-1 line-clamp-2 text-sm text-slate-700">
                          {firstFastQuestion.question}
                        </p>
                        {firstFastQuestion.answerKeywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {firstFastQuestion.answerKeywords.slice(0, 3).map((keyword) => (
                              <span
                                key={`${firstFastQuestion.id}-${keyword}`}
                                className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-[11px] text-slate-600"
                              >
                                {keyword}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <p className="text-sm font-medium text-teal-700">Open case</p>
                    <select
                      value={vivaCase.folderId || ""}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleMoveCaseToFolder(vivaCase.id, e.target.value);
                      }}
                      className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs text-slate-600 outline-none"
                    >
                      <option value="">Unfoldered</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {folder.title}
                        </option>
                      ))}
                    </select>
                  </div>

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
          )}
        </section>
      </div>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Viva Case?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this case? This will hide it from the active viva
              case list.
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog
        open={!!folderDeleteTarget}
        onOpenChange={(open) => {
          if (!open) setFolderDeleteTarget(null);
        }}
      >
        <AlertDialogContent className="rounded-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Viva Folder?</AlertDialogTitle>
            <AlertDialogDescription>
              {folderDeleteTarget
                ? `${folderDeleteTarget.title} contains ${folderDeleteTarget.count} viva set${
                    folderDeleteTarget.count === 1 ? "" : "s"
                  }. Do you still want to delete it?`
                : "Do you still want to delete this folder?"}
              <span className="mt-2 block">
                The viva sets will be moved to Unfoldered so authored cases are not lost.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteFolder}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              Delete Folder
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
