"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
    });

    setLoading(false);
    setOpen(false);
    onCreated();
    toast.success("Video added");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-2xl rounded-2xl p-8">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-semibold">
            Add New Video
          </DialogTitle>
          <DialogDescription>
            Add YouTube or Google Drive video to a section.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">

          {/* Title */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Video Title
            </label>
            <Input
              placeholder="e.g. Understanding useEffect"
              value={form.title}
              onChange={(e) =>
                setForm({ ...form, title: e.target.value })
              }
              className="h-11"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Description
            </label>
            <Textarea
              rows={3}
              placeholder="Short description about this lecture..."
              value={form.description}
              onChange={(e) =>
                setForm({
                  ...form,
                  description: e.target.value,
                })
              }
              className="resize-none"
            />
          </div>

          {/* URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Video URL
            </label>
            <Input
              placeholder="Paste YouTube or Drive link"
              value={form.videoUrl}
              onChange={(e) =>
                setForm({
                  ...form,
                  videoUrl: e.target.value,
                })
              }
              className="h-11"
            />
            <p className="text-xs text-muted-foreground">
              Supports youtube.com, youtu.be and drive.google.com
            </p>
          </div>

          {/* Section Select */}
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Assign Section
            </label>
            <select
              className="w-full h-11 rounded-md border px-3 text-sm focus:outline-none focus:ring-2 focus:ring-black"
              value={form.sectionId}
              onChange={(e) =>
                setForm({
                  ...form,
                  sectionId: e.target.value,
                })
              }
            >
              <option value="">
                Select Section
              </option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>

          {/* Footer Buttons */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>

            <Button
              onClick={handleCreate}
              disabled={loading}
              className="px-6"
            >
              {loading ? "Saving..." : "Save Video"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}