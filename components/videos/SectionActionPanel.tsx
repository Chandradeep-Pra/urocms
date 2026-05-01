"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderPlus, Loader2, Pencil, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  fetchDriveFolders,
  fetchDriveFolderVideos,
  importDriveVideosToSection,
  type DriveFolderOption,
  type DriveVideoOption,
  updateVideoSection,
} from "@/lib/services/videoAdminClient";

interface SectionOption {
  id: string;
  title: string;
  accessTier?: "free" | "paid";
}

interface Props {
  activeSection: string;
  sections: SectionOption[];
  onSectionsUpdated: () => void | Promise<void>;
  onVideosImported: () => void | Promise<void>;
}

export default function SectionActionPanel({
  activeSection,
  sections,
  onSectionsUpdated,
  onVideosImported,
}: Props) {
  const [editOpen, setEditOpen] = useState(false);
  const [attachOpen, setAttachOpen] = useState(false);
  const [sectionTitle, setSectionTitle] = useState("");
  const [sectionAccessTier, setSectionAccessTier] = useState<"free" | "paid">("free");
  const [savingSection, setSavingSection] = useState(false);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [importing, setImporting] = useState(false);
  const [folders, setFolders] = useState<DriveFolderOption[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [driveVideos, setDriveVideos] = useState<DriveVideoOption[]>([]);
  const [selectedVideoIds, setSelectedVideoIds] = useState<string[]>([]);

  const section = useMemo(
    () => sections.find((item) => item.id === activeSection) || null,
    [activeSection, sections]
  );

  useEffect(() => {
    if (!section) {
      setEditOpen(false);
      setAttachOpen(false);
      return;
    }

    setSectionTitle(section.title);
    setSectionAccessTier(section.accessTier === "paid" ? "paid" : "free");
  }, [section]);

  useEffect(() => {
    if (!attachOpen || folders.length > 0 || !section) {
      return;
    }

    const loadFolders = async () => {
      try {
        setLoadingFolders(true);
        const data = await fetchDriveFolders();
        setFolders(data.folders || []);

        const initialFolderId = data.configuredFolderId || data.folders?.[0]?.id || "";
        if (initialFolderId) {
          setSelectedFolderId(initialFolderId);
        }
      } catch (error: any) {
        toast.error(error.message || "Could not load Drive folders");
      } finally {
        setLoadingFolders(false);
      }
    };

    loadFolders();
  }, [attachOpen, folders.length, section]);

  useEffect(() => {
    if (!attachOpen || !selectedFolderId) {
      return;
    }

    const loadVideos = async () => {
      try {
        setLoadingVideos(true);
        const data = await fetchDriveFolderVideos(selectedFolderId);
        setDriveVideos(data.videos || []);
        setSelectedVideoIds([]);
      } catch (error: any) {
        setDriveVideos([]);
        setSelectedVideoIds([]);
        toast.error(error.message || "Could not load Drive videos");
      } finally {
        setLoadingVideos(false);
      }
    };

    loadVideos();
  }, [attachOpen, selectedFolderId]);

  if (!section) {
    return (
      <p className="max-w-sm text-right text-sm text-slate-500">
        Select a section to edit its settings or attach Google Drive videos.
      </p>
    );
  }

  const selectedVideos = driveVideos.filter((video) => selectedVideoIds.includes(video.id));

  const saveSection = async () => {
    try {
      setSavingSection(true);
      await updateVideoSection(section.id, {
        title: sectionTitle,
        accessTier: sectionAccessTier,
      });
      await onSectionsUpdated();
      toast.success("Section updated");
      setEditOpen(false);
    } catch (error: any) {
      toast.error(error.message || "Could not update section");
    } finally {
      setSavingSection(false);
    }
  };

  const runImport = async (videosToImport: DriveVideoOption[]) => {
    if (!videosToImport.length) {
      toast.error("Choose at least one Drive video");
      return;
    }

    const confirmed = window.confirm(
      `You are adding Videos from google drive to ${section.title}. Proceed or cancel`
    );

    if (!confirmed) return;

    const toastId = `drive-import-${section.id}`;

    try {
      setImporting(true);
      toast.loading(`Preparing to import ${videosToImport.length} videos...`, {
        id: toastId,
      });

      const result = await importDriveVideosToSection({
        sectionId: section.id,
        sectionName: section.title,
        accessTier: sectionAccessTier,
        videos: videosToImport,
        onProgress: (progress) => {
          const label = progress.currentVideoName
            ? `Importing ${progress.completed + 1}/${progress.total}: ${progress.currentVideoName}`
            : `Finishing import ${progress.completed}/${progress.total}`;

          toast.loading(label, { id: toastId });
        },
      });

      await onVideosImported();
      setSelectedVideoIds([]);

      toast.success(
        `Added ${result.added} videos and ${result.failed} videos failed to import.`,
        { id: toastId }
      );
    } catch (error: any) {
      toast.error(error.message || "Could not import Drive videos", {
        id: toastId,
      });
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-3">
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          variant={editOpen ? "default" : "outline"}
          onClick={() => setEditOpen(true)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </Button>
        <Button
          type="button"
          variant={attachOpen ? "default" : "outline"}
          onClick={() => setAttachOpen(true)}
        >
          <FolderPlus className="h-4 w-4" />
          Attach Drive Videos
        </Button>
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-lg rounded-3xl border border-slate-200 p-0 overflow-hidden">
          <div className="border-b bg-slate-50 px-6 py-5">
            <DialogHeader className="space-y-2">
              <DialogTitle>Edit Section</DialogTitle>
              <DialogDescription>
                Update the section name and default access tier for imported videos.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-6 py-6">
            <Input
              value={sectionTitle}
              onChange={(event) => setSectionTitle(event.target.value)}
              placeholder="Section name"
            />
            <div className="grid gap-2 sm:grid-cols-2">
              {(["free", "paid"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setSectionAccessTier(tier)}
                  className={`rounded-2xl border px-4 py-3 text-left transition ${
                    sectionAccessTier === tier
                      ? tier === "paid"
                        ? "border-emerald-500 bg-emerald-50 text-emerald-950"
                        : "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-slate-50 text-slate-700"
                  }`}
                >
                  <p className="text-sm font-medium capitalize">{tier}</p>
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={savingSection} onClick={saveSection}>
                {savingSection ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Save Section
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={attachOpen} onOpenChange={setAttachOpen}>
        <DialogContent className="sm:!max-w-4xl rounded-3xl border border-slate-200 p-0 overflow-hidden">
          <div className="border-b bg-slate-50 px-6 py-5">
            <DialogHeader className="space-y-2">
              <DialogTitle>Attach Drive Videos</DialogTitle>
              <DialogDescription>
                Imported videos will be created inside {section.title} with the current section access tier.
              </DialogDescription>
            </DialogHeader>
          </div>
          <div className="space-y-4 px-6 py-6">

            <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto_auto_auto]">
              <select
                className="h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                value={selectedFolderId}
                onChange={(event) => setSelectedFolderId(event.target.value)}
                disabled={loadingFolders}
              >
                <option value="">
                  {loadingFolders ? "Loading folders..." : "Select Drive folder"}
                </option>
                {folders.map((folder) => (
                  <option key={folder.id} value={folder.id}>
                    {folder.name}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="outline"
                disabled={!driveVideos.length || importing}
                onClick={() => setSelectedVideoIds(driveVideos.map((video) => video.id))}
              >
                Select All
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={!selectedVideoIds.length || importing}
                onClick={() => runImport(selectedVideos)}
              >
                <UploadCloud className="h-4 w-4" />
                Import Selected
              </Button>
              <Button
                type="button"
                disabled={!driveVideos.length || importing}
                onClick={() => runImport(driveVideos)}
              >
                {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Import All
              </Button>
            </div>

            <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {loadingVideos ? (
                <div className="flex items-center gap-2 rounded-2xl bg-white p-3 text-sm text-slate-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading Drive videos...
                </div>
              ) : driveVideos.length === 0 ? (
                <div className="rounded-2xl bg-white p-4 text-sm text-slate-500">
                  Choose a Drive folder to load its videos.
                </div>
              ) : (
                driveVideos.map((video) => {
                  const checked = selectedVideoIds.includes(video.id);
                  return (
                    <label
                      key={video.id}
                      className="flex items-start gap-3 rounded-2xl bg-white p-3"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(event) => {
                          setSelectedVideoIds((current) =>
                            event.target.checked
                              ? [...current, video.id]
                              : current.filter((id) => id !== video.id)
                          );
                        }}
                        className="mt-1 h-4 w-4 rounded border-slate-300"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-900">
                          {video.name}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">{video.mimeType}</p>
                      </div>
                    </label>
                  );
                })
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
