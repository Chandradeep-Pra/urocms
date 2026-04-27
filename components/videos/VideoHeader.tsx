"use client";

import { useState } from "react";
import { Plus, FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddSectionDialog from "./AddSectionDialog";
import AddVideoDialog from "./AddVideoDialog";
import SearchBar from "../SearchBar";

interface Props {
  data: any[];
  onSearchResults: (results: any[]) => void;
  sections: any[];
  onSectionCreated: () => void;
  onVideoCreated: () => void;
}

export default function VideoHeader({
  data,
  onSearchResults,
  sections,
  onSectionCreated,
  onVideoCreated,
}: Props) {
  const [openSection, setOpenSection] = useState(false);
  const [openVideo, setOpenVideo] = useState(false);

  return (
    <div className="w-full border-b bg-[linear-gradient(180deg,#ffffff,#f8fafc)]">
      <div className="space-y-8 px-12 py-10">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
              Student-facing content
            </div>
            <div className="space-y-2">
              <h1 className="text-4xl font-semibold tracking-tight text-slate-950">
                Video Library
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-500">
                Manage sections, YouTube and private Google Drive videos, and control which content is free versus paid.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpenSection(true)}
              className="h-11 rounded-xl px-5"
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Section
            </Button>

            <Button
              onClick={() => setOpenVideo(true)}
              className="h-11 rounded-xl px-6"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Video
            </Button>
          </div>
        </div>

        <div className="max-w-[640px]">
          <SearchBar
            data={data}
            keys={["title", "description"]}
            onResults={onSearchResults}
            placeholder="Search videos..."
          />
        </div>
      </div>

      {/* Dialogs */}
      <AddSectionDialog
        open={openSection}
        setOpen={setOpenSection}
        onCreated={onSectionCreated}
      />

      <AddVideoDialog
        open={openVideo}
        setOpen={setOpenVideo}
        sections={sections}
        onCreated={onVideoCreated}
      />

    </div>
  );
}
