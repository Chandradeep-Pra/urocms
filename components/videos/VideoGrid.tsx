"use client";

import { useRef, useState } from "react";
import {
  Check,
  CloudUpload,
  ImageUp,
  Loader2,
  Lock,
  Pencil,
  Play,
  Trash2,
  Video as VideoIcon,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import SectionActionPanel from "@/components/videos/SectionActionPanel";
import { VideoItem } from "@/app/dashboard/content/videos/page";
import { syncVideoToStorage } from "@/lib/services/videoAdminClient";

interface Props {
  activeSection: string;
  videos: VideoItem[];
  sections: { id: string; title: string; accessTier?: "free" | "paid" }[];
  onDelete: (id: string) => void;
  onPlay: (video: VideoItem) => void;
  onVideosUpdated: () => void | Promise<void>;
  onSectionsUpdated: () => void | Promise<void>;
}

function getYoutubeId(url: string) {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?]+)/
  );
  return match ? match[1] : null;
}

export default function VideoGrid({
  activeSection,
  videos,
  sections,
  onDelete,
  onPlay,
  onVideosUpdated,
  onSectionsUpdated,
}: Props) {
  const thumbnailInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [uploadingThumbnailId, setUploadingThumbnailId] = useState<string | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [form, setForm] = useState<Partial<VideoItem>>({});

  const stopCardPreview = (
    event:
      | React.MouseEvent<HTMLElement>
      | React.PointerEvent<HTMLElement>
      | React.KeyboardEvent<HTMLElement>
  ) => {
    event.stopPropagation();
  };

  const getSectionName = (id: string) =>
    sections.find((section) => section.id === id)?.title || "Unassigned";

  const startEditing = (video: VideoItem) => {
    setEditingId(video.id);
    setForm({
      title: video.title,
      description: video.description || "",
      videoUrl: video.videoUrl,
      sectionId: video.sectionId || "",
      accessTier: video.accessTier || "free",
      thumbnailUrl: video.thumbnailUrl || "",
    });
  };

  const cancelEditing = () => {
    setEditingId(null);
    setSavingId(null);
    setForm({});
  };

  const saveVideo = async (id: string) => {
    if (!form.title?.trim() || !form.videoUrl?.trim()) {
      toast.error("Title and video URL are required");
      return;
    }

    try {
      setSavingId(id);
      const res = await fetch(`/api/videos/videoItem/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description || "",
          videoUrl: form.videoUrl,
          sectionId: form.sectionId || "",
          accessTier: form.accessTier || "free",
          thumbnailUrl: form.thumbnailUrl || "",
        }),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update video");
      }

      await onVideosUpdated();
      cancelEditing();
      toast.success("Video updated");
    } catch (error: any) {
      toast.error(error.message || "Could not update video");
    } finally {
      setSavingId(null);
    }
  };

  const uploadThumbnail = async (
    id: string,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "video-thumbnails");

    const toastId = toast.loading("Uploading thumbnail...");
    setUploadingThumbnailId(id);

    try {
      const res = await fetch("/api/cloudinary-upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.url) {
        throw new Error(data?.error || "Thumbnail upload failed");
      }

      const saveRes = await fetch(`/api/videos/videoItem/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: form.title,
          description: form.description || "",
          videoUrl: form.videoUrl,
          sectionId: form.sectionId || "",
          accessTier: form.accessTier || "free",
          thumbnailUrl: data.url,
        }),
      });
      const saveData = await saveRes.json().catch(() => null);

      if (!saveRes.ok) {
        throw new Error(saveData?.error || "Thumbnail saved to Cloudinary but could not be attached to the video");
      }

      setForm((current) => ({
        ...current,
        thumbnailUrl: data.url,
      }));
      await onVideosUpdated();
      toast.success("Thumbnail uploaded", { id: toastId });
    } catch (error: any) {
      toast.error(error.message || "Thumbnail upload failed", { id: toastId });
    } finally {
      setUploadingThumbnailId(null);
      event.target.value = "";
    }
  };

  const syncToStorage = async (video: VideoItem) => {
    const toastId = toast.loading("Syncing Drive video to Google Cloud Storage...");
    setSyncingId(video.id);

    try {
      const result = await syncVideoToStorage(video.id);
      await onVideosUpdated();
      toast.success(
        result.alreadySynced
          ? "Video was already synced to Google Cloud Storage"
          : "Video synced to Google Cloud Storage and ready for in-app playback",
        { id: toastId }
      );
    } catch (error: any) {
      toast.error(error.message || "Failed to sync video to Google Cloud Storage", {
        id: toastId,
      });
    } finally {
      setSyncingId(null);
    }
  };

  return (
    <div className="min-w-0 flex-1 p-4 md:p-5 lg:p-6">
      <div className="mb-5 flex items-end justify-between gap-4 rounded-3xl border border-slate-200 bg-white px-5 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {activeSection === "all"
              ? "All Sections"
              : sections.find((s) => s.id === activeSection)?.title || "Section"}
          </p>
          <h2 className="mt-1 text-lg font-semibold text-slate-900">
            {videos.length} video{videos.length === 1 ? "" : "s"} in view
          </h2>
        </div>
        <SectionActionPanel
          activeSection={activeSection}
          sections={sections}
          onSectionsUpdated={onSectionsUpdated}
          onVideosImported={onVideosUpdated}
        />
      </div>

      {videos.length === 0 ? (
        <div className="grid min-h-[320px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <div className="max-w-sm space-y-3">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-500">
              <VideoIcon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900">No videos here yet</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Try a different section or add a new video to start building this part of the library.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {videos.map((video) => {
            const ytId = getYoutubeId(video.videoUrl);
            const thumbnail =
              video.thumbnailUrl ||
              (ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null);
            const isStorageSynced = Boolean(video.storagePath);

            return (
              <Card
                key={video.id}
                className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                onClick={() => {
                  if (editingId !== video.id) {
                    onPlay(video);
                  }
                }}
              >
                <div className="relative aspect-video bg-slate-100">
                  {thumbnail ? (
                    <img
                      src={thumbnail}
                      alt={video.title}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,#e2e8f0,#f8fafc)] text-slate-400">
                      <VideoIcon className="h-10 w-10 opacity-60" />
                    </div>
                  )}

                  <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,23,42,0.02),rgba(15,23,42,0.34))]" />

                  <div className="absolute left-4 top-4 flex gap-2">
                    <span className="rounded-full bg-white/90 px-3 py-1 text-[11px] font-medium text-slate-700 backdrop-blur">
                      {isStorageSynced
                        ? "Google Cloud"
                        : video.provider === "drive"
                          ? "Google Drive"
                          : "YouTube"}
                    </span>
                    <span
                      className={`rounded-full px-3 py-1 text-[11px] font-medium backdrop-blur ${
                        video.accessTier === "paid"
                          ? "bg-emerald-500/90 text-white"
                          : "bg-white/90 text-slate-700"
                      }`}
                    >
                      {video.accessTier === "paid" ? "Paid" : "Free"}
                    </span>
                    {isStorageSynced ? (
                      <span className="rounded-full bg-amber-400/95 px-3 py-1 text-[11px] font-medium text-slate-950 backdrop-blur">
                        Synced
                      </span>
                    ) : null}
                  </div>

                  {video.accessTier === "paid" && (
                    <div className="absolute right-4 top-4 rounded-full bg-slate-950/75 p-2 text-white">
                      <Lock className="h-4 w-4" />
                    </div>
                  )}

                  <div className="absolute bottom-4 left-4">
                    <div className="grid h-12 w-12 place-items-center rounded-full bg-white/90 text-slate-900 shadow-lg transition group-hover:scale-105">
                      <Play className="ml-0.5 h-5 w-5 fill-current" />
                    </div>
                  </div>

                  <div className="absolute right-4 bottom-4 flex gap-2">
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-9 w-9 rounded-full border border-white/60 bg-white/90 backdrop-blur hover:bg-white"
                      onPointerDown={stopCardPreview}
                      onClick={(event) => {
                        stopCardPreview(event);
                        startEditing(video);
                      }}
                    >
                      <Pencil className="h-4 w-4 text-slate-700" />
                    </Button>
                    {video.provider === "drive" ? (
                      <Button
                        variant="secondary"
                        size="icon"
                        disabled={syncingId === video.id || isStorageSynced}
                        className="h-9 w-9 rounded-full border border-white/60 bg-white/90 backdrop-blur hover:bg-white disabled:opacity-100"
                        onPointerDown={stopCardPreview}
                        onClick={(event) => {
                          stopCardPreview(event);
                          syncToStorage(video);
                        }}
                        title={
                          isStorageSynced
                            ? "Already synced to Google Cloud Storage"
                            : "Sync to Google Cloud Storage"
                        }
                      >
                        {syncingId === video.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-slate-700" />
                        ) : (
                          <CloudUpload
                            className={`h-4 w-4 ${
                              isStorageSynced ? "text-amber-600" : "text-slate-700"
                            }`}
                          />
                        )}
                      </Button>
                    ) : null}
                    <Button
                      variant="secondary"
                      size="icon"
                      className="h-9 w-9 rounded-full border border-white/60 bg-white/90 backdrop-blur hover:bg-white"
                      onPointerDown={stopCardPreview}
                      onClick={(event) => {
                        stopCardPreview(event);
                        onDelete(video.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </div>
                </div>

                {editingId === video.id ? (
                  <div
                    className="space-y-4 border-t border-slate-100 p-5"
                    onClick={(event) => event.stopPropagation()}
                  >
                    <div className="grid gap-3">
                      <Input
                        value={form.title || ""}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, title: e.target.value }))
                        }
                        placeholder="Video title"
                      />
                      <Textarea
                        value={form.description || ""}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, description: e.target.value }))
                        }
                        placeholder="Description"
                        rows={3}
                        className="resize-none"
                      />
                      <Input
                        value={form.videoUrl || ""}
                        onChange={(e) =>
                          setForm((current) => ({ ...current, videoUrl: e.target.value }))
                        }
                        placeholder="Video URL"
                      />
                      <Input
                        value={form.thumbnailUrl || ""}
                        onChange={(e) =>
                          setForm((current) => ({
                            ...current,
                            thumbnailUrl: e.target.value,
                          }))
                        }
                        placeholder="Thumbnail URL override (optional)"
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          ref={(node) => {
                            thumbnailInputRefs.current[video.id] = node;
                          }}
                          type="file"
                          accept="image/*"
                          hidden
                          onChange={(event) => uploadThumbnail(video.id, event)}
                          disabled={uploadingThumbnailId === video.id}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          disabled={uploadingThumbnailId === video.id}
                          onClick={() => thumbnailInputRefs.current[video.id]?.click()}
                        >
                          {uploadingThumbnailId === video.id ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin" />
                              Uploading
                            </>
                          ) : (
                            <>
                              <ImageUp className="h-4 w-4" />
                              Upload Thumbnail
                            </>
                          )}
                        </Button>
                        {form.thumbnailUrl ? (
                          <span className="text-xs text-slate-500">
                            Cloudinary image ready
                          </span>
                        ) : null}
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2">
                        <select
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                          value={form.sectionId || ""}
                          onChange={(e) =>
                            setForm((current) => ({ ...current, sectionId: e.target.value }))
                          }
                        >
                          <option value="">Unassigned</option>
                          {sections.map((section) => (
                            <option key={section.id} value={section.id}>
                              {section.title}
                            </option>
                          ))}
                        </select>
                        <select
                          className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                          value={form.accessTier || "free"}
                          onChange={(e) =>
                            setForm((current) => ({
                              ...current,
                              accessTier: e.target.value as "free" | "paid",
                            }))
                          }
                        >
                          <option value="free">Free</option>
                          <option value="paid">Paid</option>
                        </select>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        size="sm"
                        disabled={savingId === video.id}
                        onClick={() => saveVideo(video.id)}
                      >
                        {savingId === video.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Check className="h-4 w-4" />
                        )}
                        Save
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={cancelEditing}>
                        <X className="h-4 w-4" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
                        {video.title}
                      </h3>
                      {/* <ChevronBadge label={getSectionName(video.sectionId)} /> */}
                    </div>

                    <p className="line-clamp-2 text-sm leading-6 text-slate-500">
                      {video.description || "No description added yet."}
                    </p>
                    {video.provider === "drive" ? (
                      <p className="text-xs font-medium text-slate-400">
                        {isStorageSynced
                          ? "Playback now uses Google Cloud Storage."
                          : "Sync this Drive video to Google Cloud Storage for in-app playback."}
                      </p>
                    ) : null}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function ChevronBadge({ label }: { label: string }) {
  return (
    <span className="shrink-0 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-medium text-slate-600">
      {label}
    </span>
  );
}
