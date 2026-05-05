"use client";

import { CirclePlay, Star } from "lucide-react";
import { useEffect, useState } from "react";
import VideoPlayerLayout from "@/components/videos/VideoPlayerLayout";

const youtubeVideosOnTop = [
 "https://youtu.be/TiEs3ueXQoY?si=5pYCm1tRu7M0H_dR",
  "https://youtu.be/zySXS62n8Do?si=nFNrSCTs-620gyXZ",
  "https://youtu.be/eZsHuI6RuRQ?si=w3DGJvmc11WixCUu",
  "https://youtu.be/4IUBKTmbOQw?si=GzkJbZl9Flkbplul",
  "https://youtu.be/fgXljlx3_IU?si=KU1ld0SVOEY9WUO3",
  "https://youtu.be/8yo5WKr-zfI?si=lxVvDIGfUdk_nxGP",
  "https://youtu.be/3UUYtFTw8fg?si=-Mln1iiEDF96dUj9",
  "https://youtu.be/6zIGbtT9JRM?si=xto53skD8b82zs9i",
  "https://youtu.be/porL_VVvEoA?si=l0pi54oLP6b2WkPu",
  "https://youtu.be/Ci9sXUNot30?si=7AAKZU0U3jpS-TaH",
  "https://youtu.be/8La7HbM9g8Y?si=GhmE6s-Rb9pMFn9J",
  "https://youtu.be/1wM5Rdk7bTs?si=3lvbSWpKtF7w_-Q7"
  
]
function getYoutubeId(url: string) {
  return url.match(/youtu\.be\/([^?]+)/)?.[1] || "";
}

export function SuccessStoriesSection() {
  const [titles, setTitles] = useState<Record<string, string>>({});
  const [selectedVideo, setSelectedVideo] = useState<{
    title: string;
    videoUrl: string;
  } | null>(null);

  const marqueeVideos = [...youtubeVideosOnTop, ...youtubeVideosOnTop]; // loop

  useEffect(() => {
    youtubeVideosOnTop.forEach(async (url) => {
      try {
        const res = await fetch(
          `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`
        );
        const data = await res.json();

        setTitles((prev) => ({
          ...prev,
          [url]: data.title,
        }));
      } catch {
        setTitles((prev) => ({
          ...prev,
          [url]: "Success Story",
        }));
      }
    });
  }, []);

  return (
    <section id="stories" className="bg-cyan-50 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#071014] sm:text-6xl">
            Success <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">Stories</span>
          </h2>
        </div>

        <div className="group ">
          <div className="flex min-w-max gap-5 animate-marquee group-hover:[animation-play-state:paused]">
            {marqueeVideos.map((url, index) => {
              const videoId = getYoutubeId(url);
              const title = titles[url] || "Loading story...";

              return (
                <button
                  key={`${url}-${index}`}
                  type="button"
                  onClick={() => setSelectedVideo({ title, videoUrl: url })}
                  className="w-[68vw] max-w-[280px] shrink-0 overflow-hidden rounded-[24px] border border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.09)] transition-all duration-300 hover:-translate-y-1 hover:border-[#0f7896]/28 hover:shadow-[0_22px_55px_rgba(15,120,150,0.16)] sm:w-[420px] sm:max-w-none sm:rounded-[28px]"
                >
                  <div className="relative aspect-video overflow-hidden bg-cyan-50">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${videoId}/hqdefault.jpg`}
                      alt={title}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />

                    <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10" />

                    <div className="absolute inset-0 grid place-items-center">
                      <div className="grid h-14 w-14 place-items-center rounded-full bg-white/95 text-[#0f7896] shadow-[0_14px_35px_rgba(0,0,0,0.18)] transition group-hover:scale-110">
                        <CirclePlay className="h-7 w-7" />
                      </div>
                    </div>
                  </div>

                  <div className="p-5">
                    <div className="mb-3 flex gap-1 text-[#D4A017]">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-current" />
                      ))}
                    </div>

                    <h3 className="line-clamp-2 text-base font-semibold leading-snug text-[#071014]">
                      {title}
                    </h3>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <VideoPlayerLayout
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </section>
  );
}
