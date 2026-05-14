import { adminFetch } from "@/lib/client/adminApi";

export interface DriveFolderOption {
  id: string;
  name: string;
  webViewLink: string;
  modifiedTime: string | null;
}

export interface DriveVideoOption {
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

async function parseJson<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error((data as any)?.error || "Request failed");
  }
  return data as T;
}

export async function updateVideoSection(
  sectionId: string,
  payload: { title?: string; accessTier?: "free" | "paid" }
) {
  const res = await adminFetch(`/api/videos/videoSection/${sectionId}`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<{ success: true }>(res);
}

export async function fetchDriveFolders() {
  const res = await adminFetch("/api/videos/drive-folders");
  return parseJson<{
    folders: DriveFolderOption[];
    configuredFolderId?: string;
  }>(res);
}

export async function fetchDriveFolderVideos(folderId: string) {
  const res = await adminFetch(
    `/api/videos/drive-library?folderId=${encodeURIComponent(folderId)}`
  );
  return parseJson<{
    folderId: string;
    videos: DriveVideoOption[];
  }>(res);
}

export async function createVideoItem(payload: {
  title: string;
  description?: string;
  videoUrl: string;
  sectionId?: string;
  accessTier?: "free" | "paid";
  thumbnailUrl?: string;
}) {
  const res = await adminFetch("/api/videos/videoItem", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  return parseJson<{ id: string }>(res);
}

export async function syncVideoToStorage(videoId: string) {
  const res = await adminFetch(`/api/videos/videoItem/${videoId}/sync-storage`, {
    method: "POST",
  });

  return parseJson<{
    success: true;
    id: string;
    storagePath: string;
    mimeType?: string;
    alreadySynced: boolean;
  }>(res);
}

export async function importDriveVideosToSection(input: {
  sectionId: string;
  sectionName: string;
  accessTier: "free" | "paid";
  videos: DriveVideoOption[];
  onProgress?: (progress: {
    completed: number;
    total: number;
    added: number;
    failed: number;
    currentVideoName: string;
  }) => void;
}) {
  let added = 0;
  let failed = 0;

  for (let index = 0; index < input.videos.length; index += 1) {
    const video = input.videos[index];

    input.onProgress?.({
      completed: index,
      total: input.videos.length,
      added,
      failed,
      currentVideoName: video.name,
    });

    try {
      await createVideoItem({
        title: video.name.replace(/\.[^/.]+$/, ""),
        description: `Imported from Google Drive into ${input.sectionName}`,
        videoUrl: video.webViewLink,
        sectionId: input.sectionId,
        accessTier: input.accessTier,
        thumbnailUrl: video.thumbnailLink || "",
      });
      added += 1;
    } catch {
      failed += 1;
    }
  }

  input.onProgress?.({
    completed: input.videos.length,
    total: input.videos.length,
    added,
    failed,
    currentVideoName: "",
  });

  return { added, failed };
}
