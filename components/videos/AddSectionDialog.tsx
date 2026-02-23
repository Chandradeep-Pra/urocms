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
import { toast } from "sonner";

interface Props {
  open: boolean;
  setOpen: (v: boolean) => void;
  onCreated: () => void;
}

export default function AddSectionDialog({
  open,
  setOpen,
  onCreated,
}: Props) {
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error("Section name required");
      return;
    }

    setLoading(true);

    await fetch("/api/videos/videoSection", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });

    setTitle("");
    setLoading(false);
    setOpen(false);
    onCreated();
    toast.success("Section created");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md rounded-2xl p-8">
        <DialogHeader className="space-y-2">
          <DialogTitle className="text-xl font-semibold">
            Create Section
          </DialogTitle>
          <DialogDescription>
            Organize videos into structured learning groups.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-6 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">
              Section Name
            </label>
            <Input
              placeholder="e.g. React Fundamentals"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="h-11"
            />
          </div>

          <div className="flex justify-end gap-3">
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
              {loading ? "Creating..." : "Create Section"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}