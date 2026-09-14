export function videoCatalogDto(id: string, data: Record<string, unknown>) {
  const text = (value: unknown) => typeof value === "string" ? value : "";
  const provider = data.provider === "drive" || data.provider === "storage" ? data.provider : "youtube";
  let thumbnailUrl = text(data.thumbnailUrl);
  if (!thumbnailUrl && provider === "youtube") {
    try {
      const url = new URL(text(data.videoUrl));
      const videoId = url.hostname === "youtu.be" ? url.pathname.slice(1) :
        ["youtube.com", "www.youtube.com", "m.youtube.com"].includes(url.hostname) ? url.searchParams.get("v") : null;
      if (videoId && /^[\w-]{11}$/.test(videoId)) thumbnailUrl = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    } catch { /* Older catalog entries may have no media URL. */ }
  }
  return {
    id,
    title: text(data.title),
    description: text(data.description),
    provider,
    sectionId: text(data.sectionId),
    thumbnailUrl,
    durationSeconds: typeof data.durationSeconds === "number" && Number.isFinite(data.durationSeconds) ? data.durationSeconds : null,
    durationMinutes: typeof data.durationMinutes === "number" && Number.isFinite(data.durationMinutes) ? data.durationMinutes : null,
    isSyncedToCloudStorage: Boolean(data.storagePath),
  };
}
