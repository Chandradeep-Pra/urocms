"use client";

import { useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

type MediaType = "image" | "youtube" | null;

interface AnnouncementForm {
  title: string;
  subtitle: string;
  description: string;
  mediaType: MediaType;
  mediaSrc: string;
}

export default function AnnouncementManager() {
  const [form, setForm] = useState<AnnouncementForm>({
    title: "",
    subtitle: "",
    description: "",
    mediaType: null,
    mediaSrc: "",
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const update = <K extends keyof AnnouncementForm>(key: K, value: AnnouncementForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "announcements");

    const toastId = toast.loading("Uploading image...");
    setUploadingImage(true);

    try {
      const res = await fetch("/api/cloudinary-upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      update("mediaSrc", data.url);
      toast.success("Image uploaded", { id: toastId });
    } catch {
      toast.error("Image upload failed", { id: toastId });
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  async function publishAnnouncement() {
    if (!form.title) {
      toast.error("Title is required");
      return;
    }

    try {
      setLoading(true);

      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!res.ok) throw new Error();

      toast.success("📢 Announcement Published!");

      setForm({
        title: "",
        subtitle: "",
        description: "",
        mediaType: null,
        mediaSrc: "",
      });

    } catch {
      toast.error("Failed to publish");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-3xl shadow-xl border">
      <CardContent className="p-6 space-y-6">

        <div>
          <h2 className="text-lg font-semibold">
            Create Announcement
          </h2>
          <p className="text-sm text-muted-foreground">
            Push updates directly to mobile app
          </p>
        </div>

        {/* Title */}
        <Input
          placeholder="Title"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />

        {/* Subtitle */}
        <Input
          placeholder="Subtitle (optional)"
          value={form.subtitle}
          onChange={(e) => update("subtitle", e.target.value)}
        />

        {/* Description */}
        <Textarea
          placeholder="Description (optional)"
          rows={4}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />

        {/* Media Type Buttons */}
        <div className="flex gap-3">
          <Button
            type="button"
            variant={form.mediaType === "image" ? "default" : "outline"}
            onClick={() => update("mediaType", "image")}
          >
            Image
          </Button>

          <Button
            type="button"
            variant={form.mediaType === "youtube" ? "default" : "outline"}
            onClick={() => update("mediaType", "youtube")}
          >
            YouTube
          </Button>

          <Button
            type="button"
            variant="ghost"
            onClick={() => update("mediaType", null)}
          >
            None
          </Button>
        </div>

        {/* Media Input */}
        {form.mediaType && (
          <div className="space-y-3">
            <Input
              placeholder={
                form.mediaType === "image"
                  ? "Paste image URL"
                  : "Paste YouTube video ID"
              }
              value={form.mediaSrc}
              onChange={(e) => update("mediaSrc", e.target.value)}
            />

            {form.mediaType === "image" && (
              <label className="inline-flex cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                <Button type="button" variant="outline" disabled={uploadingImage}>
                  {uploadingImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Uploading
                    </>
                  ) : (
                    <>
                      <ImageUp className="mr-2 h-4 w-4" />
                      Upload Image
                    </>
                  )}
                </Button>
              </label>
            )}
          </div>
        )}

        {/* Publish */}
        <Button
          onClick={publishAnnouncement}
          disabled={loading}
          className="w-full"
        >
          {loading ? "Publishing..." : "Publish Announcement"}
        </Button>

      </CardContent>
    </Card>
  );
}
