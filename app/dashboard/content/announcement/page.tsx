"use client";

import { useEffect, useRef, useState } from "react";
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

interface ActiveAnnouncement {
  id: string;
  title: string;
  subtitle?: string;
}

type BroadcastEvent = {
  type: "start" | "sending" | "sent" | "failed" | "complete" | "error";
  total?: number;
  sent?: number;
  failed?: number;
  name?: string;
  email?: string;
  index?: number;
  message?: string;
};

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
  const [sendOverEmail, setSendOverEmail] = useState(false);
  const [activeAnnouncements, setActiveAnnouncements] = useState<ActiveAnnouncement[]>([]);
  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const update = <K extends keyof AnnouncementForm>(key: K, value: AnnouncementForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  async function loadActiveAnnouncements() {
    try {
      const res = await adminFetch("/api/announcements", { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (res.ok) {
        setActiveAnnouncements(data?.announcements ?? []);
      }
    } catch {
      setActiveAnnouncements([]);
    }
  }

  useEffect(() => {
    void loadActiveAnnouncements();
  }, []);

  async function broadcastAnnouncement(
    announcementId: string,
    toastId: string | number
  ) {
    const response = await adminFetch(
      `/api/announcements/${encodeURIComponent(announcementId)}/broadcast`,
      { method: "POST" }
    );

    if (!response.ok) {
      const data = await response.json().catch(() => null);
      throw new Error(data?.error || "Failed to send announcement emails");
    }

    if (!response.body) {
      throw new Error("Email progress stream was unavailable");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let completed = false;

    const processEvent = (event: BroadcastEvent) => {
      if (event.type === "start") {
        toast.loading(`Preparing to email ${event.total ?? 0} users...`, {
          id: toastId,
        });
      }

      if (event.type === "sending") {
        const recipient = event.name || event.email || "Member";
        toast.loading(
          `Sending to ${recipient} (${event.index ?? 0}/${event.total ?? 0})`,
          { id: toastId }
        );
      }

      if (event.type === "complete") {
        completed = true;
        const message = `Report: sent to ${event.sent ?? 0} users and failed to send ${event.failed ?? 0} users.`;

        if ((event.failed ?? 0) > 0) {
          toast.warning(message, { id: toastId, duration: 8000 });
        } else {
          toast.success(message, { id: toastId, duration: 8000 });
        }
      }

      if (event.type === "error") {
        throw new Error(event.message || "Email broadcast failed");
      }
    };

    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });

      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (line.trim()) {
          processEvent(JSON.parse(line) as BroadcastEvent);
        }
      }

      if (done) break;
    }

    if (buffer.trim()) {
      processEvent(JSON.parse(buffer) as BroadcastEvent);
    }

    if (!completed) {
      throw new Error("Email broadcast ended before the final report");
    }
  }

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

    const toastId = toast.loading("Publishing announcement...");
    let announcementPublished = false;

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

      if (sendOverEmail && !data?.id) {
        throw new Error("Announcement was published without an email broadcast id");
      }

      announcementPublished = true;

      if (sendOverEmail) {
        toast.loading("Announcement published. Preparing email broadcast...", {
          id: toastId,
        });
        await broadcastAnnouncement(data.id, toastId);
      } else {
        toast.success("Announcement published", { id: toastId });
      }

      await loadActiveAnnouncements();

      setForm({
        title: "",
        subtitle: "",
        description: "",
        kind: "general",
        endsAt: "",
        mediaType: null,
        mediaSrc: "",
      });
      setSendOverEmail(false);
    } catch (error) {
      toast.error(
        announcementPublished
          ? `Announcement published, but ${error instanceof Error ? error.message : "email broadcast failed"}`
          : error instanceof Error
            ? error.message
            : "Failed to publish",
        { id: toastId, duration: 8000 }
      );

      if (announcementPublished) {
        await loadActiveAnnouncements();
      }
    } finally {
      setLoading(false);
    }
  }

  async function unpublishAnnouncement(id: string) {
    try {
      const res = await adminFetch(`/api/announcements?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to unpublish");
      }

      toast.success("Announcement unpublished");
      await loadActiveAnnouncements();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to unpublish");
    }
  }

  return (
    <Card className="rounded-3xl border shadow-xl">
      <CardContent className="space-y-6 p-6">
        <div>
          <h2 className="text-lg font-semibold">Create Announcement</h2>
          <p className="text-sm text-muted-foreground">
            Push up to 6 active updates directly to the mobile app.
          </p>
        </div>

        <div className="rounded-2xl border bg-muted/30 p-4">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium">Active announcements</p>
            <span className="rounded-full bg-background px-3 py-1 text-xs font-semibold">
              {activeAnnouncements.length}/6
            </span>
          </div>
          {activeAnnouncements.length > 0 ? (
            <div className="mt-3 space-y-2">
              {activeAnnouncements.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl bg-background px-3 py-2"
                >
                  <div>
                    <p className="text-sm font-medium">{item.title}</p>
                    {item.subtitle ? (
                      <p className="text-xs text-muted-foreground">{item.subtitle}</p>
                    ) : null}
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => unpublishAnnouncement(item.id)}
                  >
                    Unpublish
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-sm text-muted-foreground">
              No active announcements are currently published.
            </p>
          )}
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

        <label className="flex cursor-pointer items-start gap-3 rounded-2xl border bg-muted/30 p-4">
          <input
            type="checkbox"
            checked={sendOverEmail}
            onChange={(event) => setSendOverEmail(event.target.checked)}
            disabled={loading}
            className="mt-0.5 h-4 w-4 rounded border-border accent-primary"
          />
          <span>
            <span className="block text-sm font-medium">
              Send this announcement over mail
            </span>
            <span className="mt-1 block text-xs leading-5 text-muted-foreground">
              Email this announcement to every user with a valid email address.
            </span>
          </span>
        </label>

        <Button
          onClick={publishAnnouncement}
          disabled={loading || activeAnnouncements.length >= 6}
          className="w-full"
        >
          {loading
            ? sendOverEmail
              ? "Publishing and emailing..."
              : "Publishing..."
            : "Publish Announcement"}
        </Button>
      </CardContent>
    </Card>
  );
}
