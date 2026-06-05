import { Check, Loader2, Pencil, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { adminFetch } from "@/lib/client/adminApi";

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
  const [draftSortOrder, setDraftSortOrder] = useState("");
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const items = [
    { id: "all", title: "All Videos", count: null as number | null },
    ...sections.map((section) => ({
      id: section.id,
      title: section.title,
      sortOrder: section.sortOrder,
      count:
        typeof section.videoCount === "number" ? section.videoCount : null,
    })),
  ];

  const startEditing = (id: string, title: string, sortOrder?: number) => {
    setEditingId(id);
    setDraftTitle(title);
    setDraftSortOrder(typeof sortOrder === "number" ? String(sortOrder) : "");
  };

  const saveEdit = async (id: string) => {
    const title = draftTitle.trim();

    if (!title) {
      toast.error("Section name required");
      return;
    }

    try {
      setLoadingId(id);
      const res = await adminFetch(`/api/videos/videoSection/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          sortOrder: draftSortOrder.trim() ? Number(draftSortOrder) : undefined,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update section");
      }

      setEditingId(null);
      setDraftTitle("");
      setDraftSortOrder("");
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
      const res = await adminFetch(`/api/videos/videoSection/${id}`, {
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
                  <Input
                    type="number"
                    min="1"
                    value={draftSortOrder}
                    onChange={(e) => setDraftSortOrder(e.target.value)}
                    className="h-9 border-white/20 bg-white text-slate-900"
                    placeholder="Sort order"
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
                        setDraftSortOrder("");
                      }}
                    >
                      <X className="h-4 w-4" />
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="group/section relative">
                  <button
                    type="button"
                    onClick={() => setActiveSection(s.id)}
                    className={`flex w-full min-w-0 items-start justify-between gap-3 rounded-xl text-left ${
                      s.id !== "all" ? "pr-8 group-hover/section:pr-[72px] group-focus-within/section:pr-[72px]" : ""
                    }`}
                  >
                    <span className="min-w-0 whitespace-normal break-words text-sm font-medium leading-5">
                      {s.title}
                    </span>
                    <span
                      className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                        activeSection === s.id
                          ? "bg-white/15 text-white"
                          : "bg-white text-slate-500"
                      }`}
                    >
                      {s.count ?? "All"}
                    </span>
                  </button>

                  {s.id !== "all" && (
                    <div
                      className={`absolute right-0 top-0 flex shrink-0 gap-1 rounded-full p-0.5 opacity-0 shadow-sm transition-opacity group-hover/section:opacity-100 group-focus-within/section:opacity-100 ${
                        activeSection === s.id ? "bg-slate-900" : "bg-white"
                      }`}
                    >
                      <span
                        className={`grid h-7 min-w-7 place-items-center rounded-full px-2 text-[11px] font-semibold shadow-sm ${
                          activeSection === s.id
                            ? "bg-white/15 text-white"
                            : "bg-white text-slate-500"
                        }`}
                      >
                        {typeof s.sortOrder === "number" ? s.sortOrder : "-"}
                      </span>
                      <Button
                        type="button"
                        size="icon-xs"
                        variant={activeSection === s.id ? "secondary" : "ghost"}
                        disabled={loadingId === s.id}
                        onClick={() => startEditing(s.id, s.title, s.sortOrder)}
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
