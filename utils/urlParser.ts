export function parseVideo(url: string) {
  if (url.includes("youtube") || url.includes("youtu.be")) {
    return { provider: "youtube" }
  }

  const directMatch = url.match(/\/d\/([^/]+)/)
  const queryMatch = url.match(/[?&]id=([^&]+)/)
  const driveFileId = directMatch?.[1] || queryMatch?.[1]

  if (driveFileId) {
    return {
      provider: "drive",
      driveFileId
    }
  }

  throw new Error("Invalid video URL")
}
