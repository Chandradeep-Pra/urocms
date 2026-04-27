"use client";

import { Lock, Play, Trash2, Video as VideoIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { VideoItem } from "@/app/dashboard/content/videos/page";

interface Props {
  videos: any[];
  sections: any[];
  onDelete: (id: string) => void;
  onPlay: (video: VideoItem) => void;
}

function getYoutubeId(url: string) {
  const match = url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?]+)/
  );
  return match ? match[1] : null;
}

export default function VideoGrid({
  videos,
  sections,
  onDelete,
  onPlay,
}: Props) {
  const getSectionName = (id: string) =>
    sections.find((section) => section.id === id)?.title || "Unassigned";

  return (
    <div className="flex-1 grid gap-8 p-8 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((video) => {
        const ytId = getYoutubeId(video.videoUrl);
        const thumbnail = ytId
          ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
          : null;

        return (
          <Card
            key={video.id}
            className="group overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
            onClick={() => onPlay(video)}
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
                  {video.provider === "drive" ? "Google Drive" : "YouTube"}
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

              <div className="absolute right-4 bottom-4">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-9 w-9 rounded-full border border-white/60 bg-white/90 backdrop-blur hover:bg-white"
                  onClick={(event) => {
                    event.stopPropagation();
                    onDelete(video.id);
                  }}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>

            <div className="space-y-3 p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="line-clamp-2 text-base font-semibold text-slate-900">
                  {video.title}
                </h3>
                <ChevronBadge label={getSectionName(video.sectionId)} />
              </div>

              <p className="line-clamp-2 text-sm leading-6 text-slate-500">
                {video.description || "No description added yet."}
              </p>
            </div>
          </Card>
        );
      })}
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
