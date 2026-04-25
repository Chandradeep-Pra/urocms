"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { BadgeCheck, Lock, PlayCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface Props {
  open: boolean;
  setOpen: (v: boolean) => void;
  sections: { id: string; title: string }[];
  onCreated: () => void;
}

export default function AddVideoDialog({
  open,
  setOpen,
  sections,
  onCreated,
}: Props) {
  const [form, setForm] = useState({
    title: "",
    description: "",
    videoUrl: "",
    sectionId: "",
    accessTier: "free" as "free" | "paid",
  });

  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!form.title || !form.videoUrl) {
      toast.error("Title and URL required");
      return;
    }

    setLoading(true);

    await fetch("/api/videos/videoItem", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    setForm({
      title: "",
      description: "",
      videoUrl: "",
      sectionId: "",
      accessTier: "free",
    });

    setLoading(false);
    setOpen(false);
    onCreated();
    toast.success("Video added");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:!max-w-3xl rounded-3xl border border-slate-200 p-0 overflow-hidden">
        <div className="border-b bg-slate-50 px-8 py-6">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-2xl font-semibold">Add Video</DialogTitle>
            <DialogDescription className="text-sm leading-6">
              Add YouTube or private Google Drive video content and decide whether it should be free or paid.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-7 px-8 py-7">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm">
                  <PlayCircle className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-slate-900">YouTube supported</p>
                  <p className="text-xs text-slate-500">Good for public or preview content</p>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-emerald-700 shadow-sm">
                  <Lock className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-emerald-900">Private Google Drive supported</p>
                  <p className="text-xs text-emerald-700">
                    Best used with paid access and Google email permission grant
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Video Title</label>
              <Input
                placeholder="e.g. Ureteric colic management"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">Assign Section</label>
              <select
                className="h-11 w-full rounded-xl border px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                value={form.sectionId}
                onChange={(e) => setForm({ ...form, sectionId: e.target.value })}
              >
                <option value="">Select Section</option>
                {sections.map((section) => (
                  <option key={section.id} value={section.id}>
                    {section.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Description</label>
            <Textarea
              rows={4}
              placeholder="Short summary about this lecture..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="resize-none rounded-2xl"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">Video URL</label>
            <Input
              placeholder="Paste YouTube or Google Drive link"
              value={form.videoUrl}
              onChange={(e) => setForm({ ...form, videoUrl: e.target.value })}
              className="h-11 rounded-xl"
            />
            <p className="text-xs leading-6 text-slate-500">
              For premium private Drive videos, make sure the file or folder is shared with your service account so the app can grant paid-user access.
            </p>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">Access Tier</label>
            <div className="grid gap-4 md:grid-cols-2">
              <button
                type="button"
                onClick={() => setForm({ ...form, accessTier: "free" })}
                className={`rounded-2xl border p-4 text-left transition ${
                  form.accessTier === "free"
                    ? "border-slate-900 bg-slate-900 text-white"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">Free / Preview</p>
                  <Sparkles className="h-4 w-4" />
                </div>
                <p className={`mt-2 text-sm ${form.accessTier === "free" ? "text-white/70" : "text-slate-500"}`}>
                  Visible to every user and suitable for preview or open learning content.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setForm({ ...form, accessTier: "paid" })}
                className={`rounded-2xl border p-4 text-left transition ${
                  form.accessTier === "paid"
                    ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                    : "border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium">Paid Only</p>
                  <BadgeCheck className="h-4 w-4" />
                </div>
                <p className={`mt-2 text-sm ${form.accessTier === "paid" ? "text-emerald-800" : "text-slate-500"}`}>
                  Intended for private course videos that only paid users should unlock.
                </p>
              </button>
            </div>
          </div>

          <div className="flex justify-end gap-3 border-t pt-5">
            <Button variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={loading} className="rounded-xl px-6">
              {loading ? "Saving..." : "Save Video"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
