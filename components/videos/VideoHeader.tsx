"use client";

import { useState } from "react";
import { CloudUpload, FolderPlus, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import AddSectionDialog from "./AddSectionDialog";
import AddVideoDialog from "./AddVideoDialog";
import SearchBar from "../SearchBar";

interface BulkSyncProgress {
  total: number;
  completed: number;
  succeeded: number;
  failed: number;
  currentTitle: string;
  scopeLabel: string;
  active: boolean;
}

interface Props {
  data: any[];
  onSearchResults: (results: any[]) => void;
  sections: any[];
  onSectionCreated: () => void;
  onVideoCreated: () => void;
  activeSectionLabel: string;
  remainingSyncCount: number;
  bulkSyncProgress: BulkSyncProgress | null;
  onSyncRemaining: () => void | Promise<void>;
}

export default function VideoHeader({
  data,
  onSearchResults,
  sections,
  onSectionCreated,
  onVideoCreated,
  activeSectionLabel,
  remainingSyncCount,
  bulkSyncProgress,
  onSyncRemaining,
}: Props) {
  const [openSection, setOpenSection] = useState(false);
  const [openVideo, setOpenVideo] = useState(false);
  const progressPercent = bulkSyncProgress
    ? Math.round((bulkSyncProgress.completed / Math.max(bulkSyncProgress.total, 1)) * 100)
    : 0;

  return (
    <div className="w-full border-b bg-[linear-gradient(180deg,#ffffff,#f8fafc)]">
      <div className="space-y-6 px-5 py-6 md:px-6 lg:px-8">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <div className="inline-flex rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-500">
              Student-facing content
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl font-semibold tracking-tight text-slate-950 md:text-4xl">
                Video Library
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-slate-500">
                Manage sections, YouTube and Google Drive imports, then sync premium videos into Google Cloud Storage for protected playback.
              </p>
            </div>
          </div>

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onSyncRemaining}
              disabled={Boolean(bulkSyncProgress?.active) || remainingSyncCount === 0}
              className="h-11 rounded-xl px-5"
            >
              {bulkSyncProgress?.active ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <CloudUpload className="mr-2 h-4 w-4" />
              )}
              {bulkSyncProgress?.active
                ? "Syncing..."
                : `Sync Remaining${remainingSyncCount ? ` (${remainingSyncCount})` : ""}`}
            </Button>
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

        <div className="max-w-[560px]">
          <SearchBar
            data={data}
            keys={["title", "description"]}
            onResults={onSearchResults}
            placeholder="Search videos..."
          />
        </div>

        {bulkSyncProgress ? (
          <div className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-slate-900">
                  Bulk sync for {bulkSyncProgress.scopeLabel}
                </p>
                <p className="text-sm text-slate-500">
                  {bulkSyncProgress.active
                    ? `Syncing ${bulkSyncProgress.completed + 1} of ${bulkSyncProgress.total}${
                        bulkSyncProgress.currentTitle ? `: ${bulkSyncProgress.currentTitle}` : ""
                      }`
                    : `Completed ${bulkSyncProgress.succeeded} of ${bulkSyncProgress.total} with ${bulkSyncProgress.failed} failed.`}
                </p>
              </div>
              <div className="text-sm font-medium text-slate-600">
                {bulkSyncProgress.completed}/{bulkSyncProgress.total}
              </div>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-slate-900 transition-[width] duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        ) : null}
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
