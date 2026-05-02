"use client";

import DeleteVideoDialog from "@/components/videos/DeleteDialog";
import DriveVideoPanel from "@/components/videos/DriveVideoPanel";
import SectionSidebar from "@/components/videos/SelectionSidebar";
import VideoGrid from "@/components/videos/VideoGrid";
import VideoHeader from "@/components/videos/VideoHeader";
import VideoPlayerLayout from "@/components/videos/VideoPlayerLayout";
import { useEffect, useMemo, useState } from "react";

export interface Section {
  id: string;
  title: string;
  accessTier?: "free" | "paid";
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  sectionId: string;
  accessTier?: "free" | "paid";
  provider?: "youtube" | "drive" | "storage";
  thumbnailUrl?: string;
  storagePath?: string;
  mimeType?: string;
  syncedToStorageAt?: string;
}

export default function AdminVideoPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeSection, setActiveSection] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [filteredVideos, setFilteredVideos] = useState<VideoItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);

  const fetchSections = async () => {
    const res = await fetch("/api/videos/videoSection");
    setSections(await res.json());
  };

  const fetchVideos = async () => {
    const res = await fetch("/api/videos/videoItem");
    const data = await res.json();
    setVideos(data);
  };

  const refreshLibrary = async () => {
    await Promise.all([fetchSections(), fetchVideos()]);
  };

  useEffect(() => {
    fetchSections();
    fetchVideos();
  }, []);

  // 🔥 Section filtering
  const sectionFiltered = useMemo(
    () =>
      activeSection === "all"
        ? videos
        : videos.filter((v) => v.sectionId === activeSection),
    [videos, activeSection]
  );

  // 🔥 Keep filteredVideos synced
  useEffect(() => {
    setFilteredVideos(sectionFiltered);
  }, [sectionFiltered]);

  const sectionsWithCounts = sections.map((section) => ({
    ...section,
    videoCount: videos.filter((video) => video.sectionId === section.id).length,
  }));

  return (
    <div className="min-h-screen w-full bg-zinc-50">
      <VideoHeader
        data={sectionFiltered}
        onSearchResults={setFilteredVideos}
        sections={sections}
        onSectionCreated={fetchSections}
        onVideoCreated={fetchVideos}
      />

      <div className="flex min-h-[calc(100vh-160px)] w-full items-start">
        <SectionSidebar
          sections={sectionsWithCounts}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
          onSectionsChanged={refreshLibrary}
        />

        <div className="min-w-0 flex-1">
          <VideoGrid
            activeSection={activeSection}
            videos={filteredVideos}
            sections={sections}
            onDelete={(id) => setDeleteId(id)}
            onPlay={(video) => setActiveVideo(video)}
            onVideosUpdated={fetchVideos}
            onSectionsUpdated={fetchSections}
          />
        </div>

        <DriveVideoPanel />
        <VideoPlayerLayout
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
        />
      </div>

      <DeleteVideoDialog
        deleteId={deleteId}
        setDeleteId={setDeleteId}
        onDeleted={fetchVideos}
      />
    </div>
  );
}
