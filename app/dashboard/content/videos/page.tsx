"use client";

import DeleteVideoDialog from "@/components/videos/DeleteDialog";
import dynamic from "next/dynamic";
import { Cloud, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import SectionSidebar from "@/components/videos/SelectionSidebar";
import VideoGrid from "@/components/videos/VideoGrid";
import VideoHeader from "@/components/videos/VideoHeader";
import { adminFetch } from "@/lib/client/adminApi";
import { syncVideoToStorage } from "@/lib/services/videoAdminClient";
import { toast } from "sonner";
import { useEffect, useMemo, useState } from "react";

const DriveVideoPanel = dynamic(() => import("@/components/videos/DriveVideoPanel"), {
  loading: () => (
    <aside aria-busy="true" aria-label="Loading Drive folders" className="w-[340px] shrink-0 space-y-4 border-l bg-white p-4 xl:w-[360px]">
      {[1, 2, 3, 4].map(item => <div key={item} className="h-12 animate-pulse rounded bg-zinc-100 motion-reduce:animate-none" />)}
    </aside>
  ),
});
const VideoPlayerLayout = dynamic(() => import("@/components/videos/VideoPlayerLayout"));

export interface Section {
  id: string;
  title: string;
  accessTier?: "free" | "paid";
  sortOrder?: number;
  imageUrl?: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  sectionId: string;
  accessTier?: "free" | "paid";
  sortOrder?: number;
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
  const [showDrive, setShowDrive] = useState(false);
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

      <div className="flex justify-end border-b border-zinc-200 px-4 py-2">
        <Button variant="outline" aria-expanded={showDrive} onClick={() => setShowDrive(value => !value)}>
          {showDrive ? <X className="h-4 w-4" /> : <Cloud className="h-4 w-4" />}
          {showDrive ? "Close Drive" : "Open Drive"}
        </Button>
      </div>
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

        {showDrive && <DriveVideoPanel />}
        {activeVideo && <VideoPlayerLayout
          video={activeVideo}
          onClose={() => setActiveVideo(null)}
        />}
      </div>

      <DeleteVideoDialog
        deleteId={deleteId}
        setDeleteId={setDeleteId}
        onDeleted={fetchVideos}
      />
    </div>
  );
}
