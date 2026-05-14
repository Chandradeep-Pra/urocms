"use client";

import DeleteVideoDialog from "@/components/videos/DeleteDialog";
import DriveVideoPanel from "@/components/videos/DriveVideoPanel";
import SectionSidebar from "@/components/videos/SelectionSidebar";
import VideoGrid from "@/components/videos/VideoGrid";
import VideoHeader from "@/components/videos/VideoHeader";
import VideoPlayerLayout from "@/components/videos/VideoPlayerLayout";
import { adminFetch } from "@/lib/client/adminApi";
import { syncVideoToStorage } from "@/lib/services/videoAdminClient";
import { toast } from "sonner";
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

interface BulkSyncProgress {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  currentTitle: string;
  scopeLabel: string;
  active: boolean;
}

export default function AdminVideoPage() {
  const [sections, setSections] = useState<Section[]>([]);
  const [videos, setVideos] = useState<VideoItem[]>([]);
  const [activeSection, setActiveSection] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const [filteredVideos, setFilteredVideos] = useState<VideoItem[]>([]);
  const [activeVideo, setActiveVideo] = useState<any | null>(null);
  const [bulkSyncProgress, setBulkSyncProgress] = useState<BulkSyncProgress | null>(null);

  const fetchSections = async () => {
    const res = await adminFetch("/api/videos/videoSection");
    setSections(await res.json());
  };

  const fetchVideos = async () => {
    const res = await adminFetch("/api/videos/videoItem");
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

  const activeSectionLabel =
    activeSection === "all"
      ? "All sections"
      : sections.find((section) => section.id === activeSection)?.title || "Selected section";

  const remainingSyncVideos = sectionFiltered.filter(
    (video) => video.provider === "drive" && !video.storagePath
  );

  const syncRemainingVideos = async () => {
    if (!remainingSyncVideos.length) {
      toast.success(`No remaining Drive videos to sync in ${activeSectionLabel}.`);
      return;
    }

    const total = remainingSyncVideos.length;
    let succeeded = 0;
    let failed = 0;

    setBulkSyncProgress({
      total,
      completed: 0,
      succeeded: 0,
      failed: 0,
      currentTitle: remainingSyncVideos[0]?.title || "",
      scopeLabel: activeSectionLabel,
      active: true,
    });

    for (let index = 0; index < remainingSyncVideos.length; index += 1) {
      const video = remainingSyncVideos[index];

      setBulkSyncProgress({
        total,
        completed: index,
        succeeded,
        failed,
        currentTitle: video.title,
        scopeLabel: activeSectionLabel,
        active: true,
      });

      try {
        await syncVideoToStorage(video.id);
        succeeded += 1;
      } catch (error: any) {
        failed += 1;
        toast.error(error.message || `Failed to sync ${video.title}`);
      }
    }

    setBulkSyncProgress({
      total,
      completed: total,
      succeeded,
      failed,
      currentTitle: "",
      scopeLabel: activeSectionLabel,
      active: false,
    });

    await fetchVideos();

    toast.success(
      failed
        ? `Sync finished for ${activeSectionLabel}: ${succeeded} synced, ${failed} failed.`
        : `Sync finished for ${activeSectionLabel}: all ${succeeded} videos synced.`
    );
  };

  return (
    <div className="min-h-screen w-full bg-zinc-50">
      <VideoHeader
        data={sectionFiltered}
        onSearchResults={setFilteredVideos}
        sections={sections}
        onSectionCreated={fetchSections}
        onVideoCreated={fetchVideos}
        activeSectionLabel={activeSectionLabel}
        remainingSyncCount={remainingSyncVideos.length}
        bulkSyncProgress={bulkSyncProgress}
        onSyncRemaining={syncRemainingVideos}
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
