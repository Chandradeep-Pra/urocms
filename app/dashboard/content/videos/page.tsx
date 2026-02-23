"use client";

import DeleteVideoDialog from "@/components/videos/DeleteDialog";
import SectionSidebar from "@/components/videos/SelectionSidebar";
import VideoGrid from "@/components/videos/VideoGrid";
import VideoHeader from "@/components/videos/VideoHeader";
import VideoPlayerLayout from "@/components/videos/VideoPlayerLayout";
import { useEffect, useState } from "react";

export interface Section {
  id: string;
  title: string;
}

export interface VideoItem {
  id: string;
  title: string;
  description: string;
  videoUrl: string;
  sectionId: string;
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

  useEffect(() => {
    fetchSections();
    fetchVideos();
  }, []);

  // 🔥 Section filtering
  const sectionFiltered =
    activeSection === "all"
      ? videos
      : videos.filter(
          (v) => v.sectionId === activeSection
        );

  // 🔥 Keep filteredVideos synced
  useEffect(() => {
    setFilteredVideos(sectionFiltered);
  }, [videos, activeSection]);

  return (
    <div className="min-h-screen w-full bg-zinc-50">

      <VideoHeader
        data={sectionFiltered}
        onSearchResults={setFilteredVideos}
        sections={sections}
        onSectionCreated={fetchSections}
        onVideoCreated={fetchVideos}
      />

      <div className="flex w-full">
        <SectionSidebar
          sections={sections}
          activeSection={activeSection}
          setActiveSection={setActiveSection}
        />

        <VideoGrid
          videos={filteredVideos}
          sections={sections}
          onDelete={(id) => setDeleteId(id)}
          onPlay={(video) => setActiveVideo(video)}
        />
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