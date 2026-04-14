"use client";

import { useEffect, useState } from "react";
import {
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { useRouter } from "next/navigation";

/* ================= TYPES ================= */

interface Attempt {
  candidate: {
    name: string;
    email: string;
  };
  report?: {
    score?: number;
  };
}

interface VivaCase {
  id: string;
  case: {
    title: string;
    level: string;
    stem: string;
    objectives: string[];
  };
  exhibits: {
    label: string;
    url: string;
    description: string;
  }[];
  marking_criteria: {
    must_mention: string[];
    critical_fail: string[];
  };
  attemptsCount?: number;
  attempts?: Attempt[];
}

/* ================= COMPONENT ================= */

export default function AIVivaPage() {
  const [cases, setCases] = useState<VivaCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [uploadingExhibitIndex, setUploadingExhibitIndex] = useState<number | null>(null);
  const router = useRouter();

  const [form, setForm] = useState({
    case: {
      title: "",
      level: "Intermediate",
      stem: "",
      objectives: [] as string[],
    },
    exhibits: [] as any[],
    marking_criteria: {
      must_mention: [] as string[],
      critical_fail: [] as string[],
    },
  });

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

  /* ================= FETCH SINGLE ================= */

  const fetchCaseDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/viva-cases/${id}`);
      const data = await res.json();

      setCases((prev) =>
        prev.map((c) =>
          c.id === id ? { ...c, ...data.case } : c
        )
      );
    } catch {
      toast.error("Failed to load case");
    }
  };

  /* ================= CREATE ================= */

  const handleSave = async () => {
    if (!form.case.title || !form.case.stem) {
      toast.error("Title & stem required");
      return;
    }

    try {
      const res = await fetch("/api/viva-cases", {
        method: "POST",
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();

      toast.success("Case created");
      setDialogOpen(false);
      fetchCases();

      setForm({
        case: { title: "", level: "Intermediate", stem: "", objectives: [] },
        exhibits: [],
        marking_criteria: { must_mention: [], critical_fail: [] },
      });

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

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    exhibitIndex: number
  ) => {
    const file = e.target.files?.[0];
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

      if (!res.ok) {
        throw new Error("Upload failed");
      }

      const data = await res.json();

      // Update the exhibit URL with the uploaded image URL
      const updated = [...form.exhibits];
      updated[exhibitIndex].url = data.url;
      setForm({ ...form, exhibits: updated });

      toast.success("Image uploaded successfully!");
    } catch (error) {
      toast.error("Image upload failed");
      console.error("Upload error:", error);
    } finally {
      setUploadingExhibitIndex(null);
    }
  };

  /* ================= UI ================= */

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">AI Viva Cases</h2>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Add Case
            </Button>
          </DialogTrigger>

          {/* ================= FULL FORM ================= */}
          <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl">

            <div className="px-6 py-5 border-b bg-slate-50">
              <DialogHeader>
                <DialogTitle>Create AI Viva Case</DialogTitle>
              </DialogHeader>
            </div>

            <div className="px-6 py-6 space-y-8 max-h-[75vh] overflow-y-auto">

              {/* CASE */}
              <section className="space-y-4">
                <Input
                  placeholder="Case Title"
                  value={form.case.title}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      case: { ...form.case, title: e.target.value },
                    })
                  }
                />

                <select
                  className="w-full border p-2 rounded"
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
                />
              </section>

              {/* OBJECTIVES */}
              <section>
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
                />
              </section>

              {/* EXHIBITS */}
              <section>
                <Button
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

                {form.exhibits.map((ex, i) => (
                  <div key={i} className="border p-4 mt-3 rounded flex flex-col gap-3 bg-slate-50">
                    <div className="flex justify-between items-start">
                      <h4 className="font-medium text-sm">Exhibit {i + 1}</h4>
                      <button
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
                    />

                    {/* IMAGE UPLOAD SECTION */}
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">Upload Image</Label>
                      <div className="flex gap-2">
                        <label className="flex-1">
                          <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => handleImageUpload(e, i)}
                            disabled={uploadingExhibitIndex === i}
                            className="hidden"
                          />
                          <Button
                            type="button"
                            variant="outline"
                            className="w-full"
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
                    />

                    <Textarea
                      placeholder="Description"
                      value={ex.description}
                      onChange={(e) => {
                        const updated = [...form.exhibits];
                        updated[i].description = e.target.value;
                        setForm({ ...form, exhibits: updated });
                      }}
                    />
                  </div>
                ))}
              </section>

              {/* MARKING */}
              <section>
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
                />
              </section>

            </div>

            <div className="px-6 py-4 border-t flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>Save Case</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* LOADING */}
      {loading && <Loader2 className="animate-spin mx-auto" />}

      {/* GRID */}
      <div className="grid lg:grid-cols-2 gap-6">
  {cases.map((c) => {
    const open = expandedId === c.id;

    return (
      <Card
        key={c.id}
        // onClick={() => {
        //   if (!open) fetchCaseDetails(c.id);
        //   setExpandedId(open ? null : c.id);
        // }}
        onClick={() => {
  router.push(`viva/${c.id}`);
}}
        className={`
          group relative cursor-pointer overflow-hidden rounded-2xl bg-white
          transition-all duration-300 transform will-change-transform
          hover:-translate-y-1 hover:scale-[1.01]
          ${
            open
              ? "border-teal-300 shadow-lg ring-2 ring-teal-100"
              : "border border-slate-200 shadow-sm hover:shadow-xl hover:border-slate-300"
          }
        `}
      >
        {/* subtle highlight */}
        <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/40 pointer-events-none" />

        <CardContent className="relative p-6 space-y-4">

          {/* HEADER */}
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <p className="font-semibold text-slate-800 leading-snug">
                {c.case.title}
              </p>

              <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
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

          {/* FOOTER */}
          <div className="flex justify-between items-center pt-1">

            <div className="flex items-center gap-1.5 text-sm text-teal-600 font-medium">
              {open ? "Hide details" : "View details"}
              {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
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

          {/* EXPAND (smooth animation) */}
          <div
            className={`grid transition-all duration-300 ease-in-out ${
              open ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0"
            }`}
          >
            <div className="overflow-hidden border-t pt-4 space-y-4">

              {/* ATTEMPTS */}
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase mb-2">
                  Attempts
                </h4>

                {c.attempts?.length ? (
                  <div className="space-y-2">
                    {c.attempts.map((a, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between bg-slate-50 px-3 py-2 rounded-lg hover:bg-slate-100 transition"
                      >
                        <div className="flex items-center gap-3">
                          {/* avatar */}
                          <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center text-xs font-semibold text-teal-700">
                            {a.candidate.name?.charAt(0)}
                          </div>

                          <div>
                            <p className="text-sm font-medium text-slate-800">
                              {a.candidate.name}
                            </p>
                            <p className="text-xs text-slate-500">
                              {a.candidate.email}
                            </p>
                          </div>
                        </div>

                        <div
                          className={`text-sm font-semibold ${
                            a.report?.score >= 80
                              ? "text-green-600"
                              : a.report?.score >= 50
                              ? "text-yellow-600"
                              : "text-red-500"
                          }`}
                        >
                          {a.report?.score ?? "-"}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400">
                    No attempts yet
                  </p>
                )}
              </div>

            </div>
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