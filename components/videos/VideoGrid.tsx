"use client";

import { Trash2, Play } from "lucide-react";
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
    sections.find((s) => s.id === id)?.title ||
    "Unassigned";

  return (
    <div className="flex-1 p-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {videos.map((v) => {
        const ytId = getYoutubeId(v.videoUrl);
        const thumbnail = ytId
          ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`
          : null;

        return (
          <Card
            key={v.id}
            className="overflow-hidden rounded-2xl border bg-white shadow-sm hover:shadow-md transition"
            onClick={() => onPlay(v)}
          >
            {/* Thumbnail */}
            <div className="relative aspect-video bg-muted">
              {thumbnail ? (
                <img
                  src={thumbnail}
                  alt={v.title}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  <Play className="h-8 w-8 opacity-40" />
                </div>
              )}

              {/* Overlay */}
              <div className="absolute inset-0 bg-black/0 hover:bg-black/20 transition" />

              {/* Delete Button */}
              <div className="absolute top-3 right-3">
                <Button
                  variant="secondary"
                  size="icon"
                  className="h-8 w-8 backdrop-blur-sm bg-white/80 hover:bg-white"
                  onClick={() => onDelete(v.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-600" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="p-5 space-y-2">
              <h3 className="font-semibold text-base line-clamp-2">
                {v.title}
              </h3>

              <p className="text-sm text-muted-foreground">
                {getSectionName(v.sectionId)}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}