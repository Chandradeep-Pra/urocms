"use client";

import { CirclePlay, Star } from "lucide-react";
import { useEffect, useState } from "react";

const youtubeVideosOnTop = [
  "https://youtu.be/igYg4nmUsLg?si=tB8GYJV_QkhYxPsH",
  "https://youtu.be/-HlSjGsLD1w?si=CVR-l7dXFx4SYFso",
  "https://youtu.be/ZQ6nakKoDu4?si=MjliHaoT0nbrqMBE",
  "https://youtu.be/pQHa4WBgRaU?si=kEYiFRQdO1BZASet",
  "https://youtu.be/nNqlihhRNfo?si=zhyU4ibI1P6mT09J",
  "https://youtu.be/PmWXC4O4V0A?si=2lbO5PBKZuAkkFqK",
];

function getYoutubeId(url: string) {
  return url.match(/youtu\.be\/([^?]+)/)?.[1] || "";
}

export function SuccessStoriesSection() {
  const [titles, setTitles] = useState<Record<string, string>>({});

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
    <section id="stories" className="bg-cyan-50 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex justify-center">
          <h2 className="max-w-3xl text-center text-4xl font-semibold tracking-[-0.04em] text-[#071014] sm:text-5xl">
            Success Stories
          </h2>
        </div>

        <div className="group ">
          <div className="flex min-w-max gap-5 animate-marquee group-hover:[animation-play-state:paused]">
            {marqueeVideos.map((url, index) => {
              const videoId = getYoutubeId(url);
              const title = titles[url] || "Loading story...";

              return (
                <a
                  key={`${url}-${index}`}
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="w-[320px] shrink-0 overflow-hidden rounded-[28px] border border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.09)] transition-all duration-300 hover:-translate-y-1 hover:border-[#0f7896]/28 hover:shadow-[0_22px_55px_rgba(15,120,150,0.16)]"
                >
                  <div className="relative aspect-video overflow-hidden bg-cyan-50">
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
                </a>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}