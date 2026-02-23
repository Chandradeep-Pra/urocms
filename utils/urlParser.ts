export function parseVideo(url: string) {
  if (url.includes("youtube") || url.includes("youtu.be")) {
    return { provider: "youtube" }
  }

  const match = url.match(/\/d\/([^/]+)/)

  if (match) {
    return {
      provider: "drive",
      driveFileId: match[1]
    }
  }

  throw new Error("Invalid video URL")
}