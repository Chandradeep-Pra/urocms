"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/client/adminApi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function QuestionImageField({ label, value, onChange, onUploadingChange, disabled }: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  onUploadingChange: (uploading: boolean) => void;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    setUploading(true);
    onUploadingChange(true);
    try {
      const body = new FormData();
      body.append("file", file);
      body.append("folder", "questions");
      const res = await adminFetch("/api/cloudinary-upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok || !data.url) throw new Error(data.error || "Image upload failed");
      onChange(data.url);
      toast.success("Image uploaded. Save the question to apply your changes.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed");
    } finally {
      setUploading(false);
      onUploadingChange(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      <Label>{label}</Label>
      <Input aria-label={`${label} URL`} value={value} placeholder="Paste an image URL or upload below" disabled={disabled || uploading} onChange={(event) => onChange(event.target.value)} />
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={(event) => { const file = event.target.files?.[0]; if (file) void upload(file); }} />
      <div className="flex gap-2">
        <Button type="button" variant="outline" disabled={disabled || uploading} onClick={() => inputRef.current?.click()}>
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
          {uploading ? "Uploading..." : "Upload image"}
        </Button>
        {value && <Button type="button" variant="ghost" disabled={disabled || uploading} onClick={() => onChange("")}><Trash2 className="h-4 w-4" />Remove</Button>}
      </div>
      {value && <img src={value} alt={`${label} preview`} className="max-h-56 max-w-full rounded-xl border object-contain" />}
    </div>
  );
}
