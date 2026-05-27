"use client";

import { CirclePlay, Star } from "lucide-react";
import { useEffect, useState } from "react";
import VideoPlayerLayout from "@/components/videos/VideoPlayerLayout";

type Testimonial = {
  id: string;
  title: string;
  videoUrl: string;
  youtubeId: string;
  candidateName: string;
  candidateRole: string;
  quote: string;
};

export function SuccessStoriesSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{
    title: string;
    videoUrl: string;
  } | null>(null);

  const marqueeTestimonials =
    testimonials.length > 0 ? [...testimonials, ...testimonials] : [];

  useEffect(() => {
    let active = true;

    async function loadTestimonials() {
      try {
        const res = await fetch("/api/testimonials", { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setTestimonials(Array.isArray(data?.testimonials) ? data.testimonials : []);
      } catch {
        if (!active) return;
        setTestimonials([]);
      }
    }

    void loadTestimonials();

    return () => {
      active = false;
    };
  }, []);

  return (
    <section id="stories" className="bg-cyan-50 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#071014] sm:text-6xl">
            Success <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">Stories</span>
          </h2>
        </div>

        {testimonials.length > 0 ? (
          <div className="group ">
            <div className="flex min-w-max gap-5 animate-marquee group-hover:[animation-play-state:paused]">
              {marqueeTestimonials.map((item, index) => {
                const title = item.title || "Success Story";

                return (
                  <button
                    key={`${item.id}-${index}`}
                    type="button"
                    onClick={() =>
                      setSelectedVideo({ title, videoUrl: item.videoUrl })
                    }
                    className="w-[68vw] max-w-[280px] shrink-0 overflow-hidden rounded-[24px] border border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.09)] transition-all duration-300 hover:-translate-y-1 hover:border-[#0f7896]/28 hover:shadow-[0_22px_55px_rgba(15,120,150,0.16)] sm:w-[420px] sm:max-w-none sm:rounded-[28px]"
                  >
                    <div className="relative aspect-video overflow-hidden bg-cyan-50">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`}
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

                      {(item.candidateName || item.candidateRole) ? (
                        <p className="mt-2 text-sm text-[#0f7896]">
                          {item.candidateName}
                          {item.candidateRole ? ` • ${item.candidateRole}` : ""}
                        </p>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="rounded-[28px] border border-[#0f7896]/12 bg-white px-6 py-10 text-center shadow-[0_16px_40px_rgba(15,120,150,0.09)]">
            <h3 className="text-lg font-semibold text-[#071014]">
              Testimonials will appear here soon
            </h3>
            <p className="mt-2 text-sm text-[#0f7896]">
              Add candidate success stories from the dashboard to populate this section.
            </p>
          </div>
        )}
      </div>

      <VideoPlayerLayout
        video={selectedVideo}
        onClose={() => setSelectedVideo(null)}
      />
    </section>
  );
}
