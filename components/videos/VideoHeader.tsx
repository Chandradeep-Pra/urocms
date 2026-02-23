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
    <div className="w-full border-b bg-background">

      <div className="px-12 py-10 space-y-8">

        {/* Title Row */}
        <div className="flex items-end justify-between">

          <div className="space-y-2">
            <h1 className="text-4xl font-semibold tracking-tight">
              Video Library
            </h1>
            <p className="text-muted-foreground">
              Manage and organize student-facing video content
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setOpenSection(true)}
              className="h-11 px-5 rounded-xl"
            >
              <FolderPlus className="mr-2 h-4 w-4" />
              Add Section
            </Button>

            <Button
              onClick={() => setOpenVideo(true)}
              className="h-11 px-6 rounded-xl"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add Video
            </Button>
          </div>

        </div>

        {/* Search 2/3 */}
        <div className="w-[600px]">
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