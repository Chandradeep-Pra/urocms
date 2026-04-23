"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState, useMemo } from "react";
import { Play, Pause, X, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  video: any | null;
  onClose: () => void;
}

/* ---------------------- URL PARSER ---------------------- */

function parseVideo(url: string) {
  // YouTube
  if (url.includes("youtube") || url.includes("youtu.be")) {
    const match = url.match(
      /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&?]+)/
    );
    return {
      provider: "youtube",
      youtubeId: match ? match[1] : null,
    };
  }

  // Google Drive
  const driveMatch = url.match(/\/d\/([^/]+)/);
  const driveQueryMatch = url.match(/[?&]id=([^&]+)/);
  const driveFileId = driveMatch?.[1] || driveQueryMatch?.[1];

  if (driveFileId) {
    return {
      provider: "drive",
      driveFileId,
      previewUrl: `https://drive.google.com/file/d/${driveFileId}/preview`,
    };
  }

  // Direct file (mp4/firebase)
  return {
    provider: "file",
    streamUrl: url,
  };
}

/* ---------------------- COMPONENT ---------------------- */

export default function VideoPlayerLayout({
  video,
  onClose,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  const parsed = useMemo(
    () => (video ? parseVideo(video.videoUrl) : null),
    [video]
  );

  /* Autoplay */
  useEffect(() => {
    if (!video || !videoRef.current) return;

    if (parsed?.provider === "file") {
      videoRef.current
        .play()
        .then(() => setPlaying(true))
        .catch(() => {
          console.log("Autoplay blocked");
        });
    }
  }, [video, parsed]);

  /* Keyboard Handling */
  useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    const active = document.activeElement as HTMLElement;

    // 🚫 Don't hijack keyboard if user is typing
    if (
      active?.tagName === "INPUT" ||
      active?.tagName === "TEXTAREA" ||
      active?.isContentEditable
    ) {
      return;
    }

    if (e.key === "Escape") {
      if (isFullscreen) {
        setIsFullscreen(false);
      } else {
        onClose();
      }
    }

    if (e.key === " " && parsed?.provider === "file") {
      e.preventDefault();
      togglePlay();
    }
  };

  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, [isFullscreen, parsed]);

  const togglePlay = async () => {
    if (!videoRef.current) return;

    if (videoRef.current.paused) {
      await videoRef.current.play();
      setPlaying(true);
    } else {
      videoRef.current.pause();
      setPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current || !videoRef.current.duration) return;

    const percent =
      (videoRef.current.currentTime /
        videoRef.current.duration) *
      100;

    setProgress(percent || 0);
  };

  return (
    <AnimatePresence>
      {video && (
        <motion.div
          className="fixed inset-0 z-[100] overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {/* Background */}
          <div
            className={`absolute inset-0 transition-all duration-300 ${
              isFullscreen
                ? "bg-black"
                : "bg-black/80 backdrop-blur-sm"
            }`}
          />

          {/* Close */}
          <div className="absolute top-6 right-6 z-50">
            <Button
              size="icon"
              className="rounded-full bg-white/20 backdrop-blur-md border border-white/20 hover:bg-white/30"
              onClick={onClose}
            >
              <X className="text-white" />
            </Button>
          </div>

          {/* Player */}
          <div className="relative flex items-center justify-center h-full w-full">
            <motion.div
              layout
              transition={{ duration: 0.3 }}
              className={`relative ${
                isFullscreen
                  ? "w-full h-full"
                  : "w-2/3 max-w-6xl"
              }`}
            >
              {!isFullscreen && (
                <div className="absolute inset-0 rounded-2xl shadow-[0_0_120px_rgba(0,0,0,0.7)] pointer-events-none" />
              )}

              {parsed?.provider === "youtube" ? (
                <iframe
                  src={`https://www.youtube.com/embed/${parsed.youtubeId}?autoplay=1`}
                  className={`${
                    isFullscreen
                      ? "w-full h-full"
                      : "w-full aspect-video rounded-2xl"
                  }`}
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : parsed?.provider === "drive" ? (
                <iframe
                  src={parsed.previewUrl}
                  className={`${
                    isFullscreen
                      ? "w-full h-full"
                      : "w-full aspect-video rounded-2xl"
                  }`}
                  allow="autoplay"
                  allowFullScreen
                />
              ) : (
                <video
                  ref={videoRef}
                  src={parsed?.streamUrl}
                  className={`${
                    isFullscreen
                      ? "w-full h-full object-contain"
                      : "w-full aspect-video rounded-2xl object-contain"
                  }`}
                  onTimeUpdate={handleTimeUpdate}
                  playsInline
                  muted
                  autoPlay
                />
              )}
            </motion.div>
          </div>

          {/* Controls (Only for HTML5 Video) */}
          {parsed?.provider === "file" && (
            <div className="absolute bottom-10 left-0 w-full px-20">
              <div className="flex items-center gap-6 w-full">

                {/* Play */}
                <Button
                  onClick={togglePlay}
                  size="icon"
                  className="h-14 w-14 flex-shrink-0 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 hover:bg-white/30"
                >
                  {playing ? (
                    <Pause className="text-white" />
                  ) : (
                    <Play className="text-white" />
                  )}
                </Button>

                {/* Progress */}
                <div
                  className="relative flex-1 h-4 bg-white/20 backdrop-blur-xl rounded-full border border-white/20 cursor-pointer"
                  onClick={(e) => {
                    if (!videoRef.current) return;

                    const rect =
                      e.currentTarget.getBoundingClientRect();

                    const percent =
                      (e.clientX - rect.left) /
                      rect.width;

                    videoRef.current.currentTime =
                      percent *
                      videoRef.current.duration;
                  }}
                >
                  <div
                    className="absolute left-0 top-0 h-full bg-white/80 rounded-full transition-all"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Fullscreen */}
                <Button
                  size="icon"
                  className="h-14 w-14 flex-shrink-0 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 hover:bg-white/30"
                  onClick={() =>
                    setIsFullscreen(!isFullscreen)
                  }
                >
                  <Maximize2 className="text-white" />
                </Button>

                {/* Speed */}
                <div className="relative flex-shrink-0">
                  <Button
                    size="icon"
                    className="h-14 w-14 rounded-full bg-white/20 backdrop-blur-xl border border-white/20 hover:bg-white/30"
                    onClick={() =>
                      setShowMenu(!showMenu)
                    }
                  >
                    ⋯
                  </Button>

                  {showMenu && (
                    <div className="absolute bottom-16 right-0 bg-black/80 backdrop-blur-xl rounded-xl p-3 space-y-2 text-white text-sm">
                      {[1, 1.25, 1.5, 2].map((speed) => (
                        <button
                          key={speed}
                          onClick={() => {
                            if (videoRef.current) {
                              videoRef.current.playbackRate =
                                speed;
                            }
                            setShowMenu(false);
                          }}
                          className="block w-full text-left hover:text-white/70"
                        >
                          {speed}x
                        </button>
                      ))}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
