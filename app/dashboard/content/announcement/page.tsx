"use client";

import { useRef, useState } from "react";
import { ImageUp, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { adminFetch } from "@/lib/client/adminApi";

type MediaType = "image" | "youtube" | null;
type AnnouncementKind = "general" | "grand-mock";

interface AnnouncementForm {
  title: string;
  subtitle: string;
  description: string;
  kind: AnnouncementKind;
  endsAt: string;
  mediaType: MediaType;
  mediaSrc: string;
}

export default function AnnouncementManager() {
  const [form, setForm] = useState<AnnouncementForm>({
    title: "",
    subtitle: "",
    description: "",
    kind: "general",
    endsAt: "",
    mediaType: null,
    mediaSrc: "",
  });

  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

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
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Image upload failed");
      }

      update("mediaSrc", data.url);
      toast.success("Image uploaded", { id: toastId });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Image upload failed", {
        id: toastId,
      });
    } finally {
      setUploadingImage(false);
      e.target.value = "";
    }
  }

  async function publishAnnouncement() {
    if (!form.title.trim()) {
      toast.error("Title is required");
      return;
    }

    try {
      setLoading(true);

      const res = await adminFetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to publish");
      }

      toast.success("Announcement published");

      setForm({
        title: "",
        subtitle: "",
        description: "",
        kind: "general",
        endsAt: "",
        mediaType: null,
        mediaSrc: "",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-3xl border shadow-xl">
      <CardContent className="space-y-6 p-6">
        <div>
          <h2 className="text-lg font-semibold">Create Announcement</h2>
          <p className="text-sm text-muted-foreground">
            Push updates directly to the mobile app.
          </p>
        </div>

        <Input
          placeholder="Title"
          value={form.title}
          onChange={(e) => update("title", e.target.value)}
        />

        <Input
          placeholder="Subtitle (optional)"
          value={form.subtitle}
          onChange={(e) => update("subtitle", e.target.value)}
        />

        <Textarea
          placeholder="Description (optional)"
          rows={4}
          value={form.description}
          onChange={(e) => update("description", e.target.value)}
        />

        <div className="space-y-3">
          <p className="text-sm font-medium">Announcement Type</p>
          <div className="flex gap-3">
            <Button
              type="button"
              variant={form.kind === "general" ? "default" : "outline"}
              onClick={() => update("kind", "general")}
            >
              General
            </Button>
            <Button
              type="button"
              variant={form.kind === "grand-mock" ? "default" : "outline"}
              onClick={() => update("kind", "grand-mock")}
            >
              Grand Mock
            </Button>
          </div>
        </div>

        {form.kind === "grand-mock" ? (
          <Input
            type="datetime-local"
            value={form.endsAt}
            onChange={(e) => update("endsAt", e.target.value)}
          />
        ) : null}

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
            variant={form.mediaType === null ? "secondary" : "ghost"}
            onClick={() => {
              update("mediaType", null);
              update("mediaSrc", "");
            }}
          >
            None
          </Button>
        </div>

        {form.mediaType ? (
          <div className="space-y-3">
            <Input
              placeholder={
                form.mediaType === "image"
                  ? "Paste image URL"
                  : "Paste full YouTube video link"
              }
              value={form.mediaSrc}
              onChange={(e) => update("mediaSrc", e.target.value)}
            />

            {form.mediaType === "image" ? (
              <>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={handleImageUpload}
                  disabled={uploadingImage}
                />
                <Button
                  type="button"
                  variant="outline"
                  disabled={uploadingImage}
                  onClick={() => imageInputRef.current?.click()}
                >
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
              </>
            ) : null}
          </div>
        ) : null}

        <Button onClick={publishAnnouncement} disabled={loading} className="w-full">
          {loading ? "Publishing..." : "Publish Announcement"}
        </Button>
      </CardContent>
    </Card>
  );
}
