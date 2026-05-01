"use client";

import { useEffect, useMemo, useState } from "react";
import { Copy, ExternalLink, FolderOpen, Loader2, RefreshCw, Video } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface DriveFolderItem {
  id: string;
  name: string;
  webViewLink: string;
  modifiedTime: string | null;
}

interface DriveVideoItem {
  id: string;
  name: string;
  mimeType: string;
  webViewLink: string;
  previewUrl: string;
  thumbnailLink: string | null;
  iconLink: string | null;
  modifiedTime: string | null;
  size: string | null;
}

function formatBytes(size: string | null) {
  const value = Number(size ?? 0);
  if (!value || Number.isNaN(value)) return "Unknown size";

  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  if (value < 1024 * 1024 * 1024) return `${(value / (1024 * 1024)).toFixed(1)} MB`;
  return `${(value / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export default function DriveVideoPanel() {
  const [folderIdInput, setFolderIdInput] = useState("");
  const [activeFolderId, setActiveFolderId] = useState("");
  const [folders, setFolders] = useState<DriveFolderItem[]>([]);
  const [videos, setVideos] = useState<DriveVideoItem[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(false);
  const [loadingVideos, setLoadingVideos] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFolders = async () => {
    try {
      setLoadingFolders(true);
      const res = await fetch("/api/videos/drive-folders");
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch Drive folders");
      }

      setFolders(data.folders || []);

      const preferredFolderId = data.configuredFolderId || data.folders?.[0]?.id || "";

      if (preferredFolderId) {
        setFolderIdInput((current) => current || preferredFolderId);
        setActiveFolderId((current) => current || preferredFolderId);
      }
    } catch (fetchError: any) {
      setError(fetchError.message || "Failed to fetch Drive folders");
    } finally {
      setLoadingFolders(false);
    }
  };

  const loadVideos = async (folderIdOverride?: string) => {
    try {
      setLoadingVideos(true);
      setError(null);

      const queryFolderId = (folderIdOverride ?? folderIdInput).trim();
      const search = queryFolderId ? `?folderId=${encodeURIComponent(queryFolderId)}` : "";
      const res = await fetch(`/api/videos/drive-library${search}`);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to fetch Drive videos");
      }

      setVideos(data.videos || []);
      setActiveFolderId(data.folderId || queryFolderId);
      if (data.folderId) {
        setFolderIdInput(data.folderId);
      }
    } catch (fetchError: any) {
      setVideos([]);
      setError(fetchError.message || "Failed to fetch Drive videos");
    } finally {
      setLoadingVideos(false);
    }
  };

  useEffect(() => {
    loadFolders();
  }, []);

  useEffect(() => {
    if (activeFolderId) {
      loadVideos(activeFolderId);
    }
  }, [activeFolderId]);

  const summary = useMemo(() => {
    if (!videos.length) return "No Drive videos found";
    return `${videos.length} video${videos.length === 1 ? "" : "s"} found`;
  }, [videos]);

  const copyVideoLink = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Drive link copied");
    } catch {
      toast.error("Could not copy link");
    }
  };

  return (
    <aside className="w-[360px] shrink-0 border-l border-slate-200 bg-white/90">
      <div className="sticky top-0 space-y-4 border-b border-slate-200 bg-white/95 p-4 backdrop-blur">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-900">Shared Drive Videos</p>
          <p className="text-xs leading-5 text-slate-500">
            Browse folders the service account can access and copy Drive links into the library.
          </p>
        </div>

        <div className="space-y-2">
          <Select
            value={activeFolderId || undefined}
            onValueChange={(value) => {
              setActiveFolderId(value);
              setFolderIdInput(value);
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue
                placeholder={loadingFolders ? "Loading folders..." : "Select accessible folder"}
              />
            </SelectTrigger>
            <SelectContent>
              {folders.map((folder) => (
                <SelectItem key={folder.id} value={folder.id}>
                  {folder.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            value={folderIdInput}
            onChange={(e) => setFolderIdInput(e.target.value)}
            placeholder="Or paste a Drive folder ID manually"
          />

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={loadingVideos}
              onClick={() => loadVideos(folderIdInput)}
            >
              {loadingVideos ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4" />
                  Refresh
                </>
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={!activeFolderId}
              onClick={() =>
                window.open(`https://drive.google.com/drive/folders/${activeFolderId}`, "_blank")
              }
            >
              <FolderOpen className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Status</p>
          <p className="mt-1 text-sm font-medium text-slate-800">{summary}</p>
          <p className="mt-1 text-xs text-slate-500">
            {loadingFolders ? "Loading accessible folders..." : `${folders.length} accessible folders`}
          </p>
          {activeFolderId && (
            <p className="mt-1 break-all text-xs text-slate-500">Folder: {activeFolderId}</p>
          )}
          {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
        </div>
      </div>

      <div className="h-[calc(100vh-210px)] overflow-y-auto p-4">
        <div className="space-y-3">
          {videos.map((video) => (
            <div key={video.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <div className="flex gap-3">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-900 text-white">
                  {video.thumbnailLink ? (
                    <img
                      src={video.thumbnailLink}
                      alt={video.name}
                      className="h-full w-full rounded-2xl object-cover"
                    />
                  ) : (
                    <Video className="h-4 w-4" />
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="line-clamp-2 text-sm font-medium text-slate-900">{video.name}</p>
                  <p className="mt-1 text-xs text-slate-500">{formatBytes(video.size)}</p>
                  {video.modifiedTime && (
                    <p className="mt-1 text-xs text-slate-500">
                      Updated {new Date(video.modifiedTime).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              <div className="mt-3 flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => copyVideoLink(video.webViewLink)}
                >
                  <Copy className="h-4 w-4" />
                  Copy Link
                </Button>

                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.open(video.webViewLink, "_blank")}
                >
                  <ExternalLink className="h-4 w-4" />
                  Open
                </Button>
              </div>
            </div>
          ))}

          {!loadingVideos && !videos.length && !error && (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm text-slate-500">
              No Drive videos found for this folder yet.
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
