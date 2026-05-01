import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  sections: any[];
  activeSection: string;
  setActiveSection: (id: string) => void;
  onSectionsChanged: () => void | Promise<void>;
}

export default function SectionSidebar({
  sections,
  activeSection,
  setActiveSection,
  onSectionsChanged,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const items = [
    { id: "all", title: "All Videos", count: null as number | null },
    ...sections.map((section) => ({
      id: section.id,
      title: section.title,
      count:
        typeof section.videoCount === "number" ? section.videoCount : null,
    })),
  ];

  const startEditing = (id: string, title: string) => {
    setEditingId(id);
    setDraftTitle(title);
  };

  const saveEdit = async (id: string) => {
    const title = draftTitle.trim();

    if (!title) {
      toast.error("Section name required");
      return;
    }

    try {
      setLoadingId(id);
      const res = await fetch(`/api/videos/videoSection/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update section");
      }

      setEditingId(null);
      setDraftTitle("");
      await onSectionsChanged();
      toast.success("Section renamed");
    } catch (error: any) {
      toast.error(error.message || "Could not update section");
    } finally {
      setLoadingId(null);
    }
  };

  const deleteSection = async (id: string, title: string) => {
    const confirmed = window.confirm(
      `Delete "${title}"? Videos in this section will be kept and marked unassigned.`
    );

    if (!confirmed) return;

    try {
      setLoadingId(id);
      const res = await fetch(`/api/videos/videoSection/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete section");
      }

      if (activeSection === id) {
        setActiveSection("all");
      }

      await onSectionsChanged();
      toast.success("Section deleted");
    } catch (error: any) {
      toast.error(error.message || "Could not delete section");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <aside className="w-[248px] shrink-0 border-r border-slate-200 bg-white/80">
      <div className="sticky top-0 space-y-4 p-4">
        <div className="rounded-2xl border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Sections
          </p>
          
        </div>

        <div className="space-y-2">
          {items.map((s) => (
            <div
              key={s.id}
              className={`rounded-2xl border px-4 py-3 transition ${
                activeSection === s.id
                  ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/10"
                  : "border-transparent bg-slate-50 text-slate-700 hover:border-slate-200 hover:bg-white"
              }`}
            >
              {editingId === s.id ? (
                <div className="space-y-3">
                  <Input
                    value={draftTitle}
                    onChange={(e) => setDraftTitle(e.target.value)}
                    className="h-9 border-white/20 bg-white text-slate-900"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      disabled={loadingId === s.id}
                      onClick={() => saveEdit(s.id)}
                    >
                      {loadingId === s.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Check className="h-4 w-4" />
                      )}
                      Save
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={loadingId === s.id}
                      onClick={() => {
                        setEditingId(null);
                        setDraftTitle("");
                      }}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveSection(s.id)}
                    className="flex min-w-0 flex-1 items-center justify-between text-left"
                  >
                    <span className="truncate text-sm font-medium">{s.title}</span>
                    <span
                      className={`ml-3 shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        activeSection === s.id
                          ? "bg-white/15 text-white"
                          : "bg-white text-slate-500"
                      }`}
                    >
                      {s.count ?? "All"}
                    </span>
                  </button>

                  {s.id !== "all" && (
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        size="icon-xs"
                        variant={activeSection === s.id ? "secondary" : "ghost"}
                        disabled={loadingId === s.id}
                        onClick={() => startEditing(s.id, s.title)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant="ghost"
                        disabled={loadingId === s.id}
                        onClick={() => deleteSection(s.id, s.title)}
                      >
                        {loadingId === s.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5 text-red-500" />
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </aside>
  );
}
