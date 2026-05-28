"use client";

import { CirclePlay, Quote } from "lucide-react";
import { useEffect, useState } from "react";
import VideoPlayerLayout from "@/components/videos/VideoPlayerLayout";

type Testimonial = {
  id: string;
  title: string;
  videoUrl: string;
  youtubeId: string;
  imageUrl: string;
  candidateName: string;
  candidateRole: string;
  companyName: string;
  quote: string;
};

export function SuccessStoriesSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{
    title: string;
    videoUrl: string;
  } | null>(null);

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

  const marqueeTestimonials = testimonials.length > 0 ? [...testimonials, ...testimonials] : [];

  return (
    <section id="stories" className="bg-cyan-50 px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#071014] sm:text-6xl">
            Success{" "}
            <span className="text-[#0f7896]">Stories</span>
          </h2>
        </div>

        {testimonials.length > 0 ? (
          <div className="group overflow-hidden pb-4">
            <div className="success-marquee flex w-max gap-5 pr-2 group-hover:[animation-play-state:paused]">
              {marqueeTestimonials.map((item, index) => (
                item.videoUrl ? (
                  <article
                    key={`${item.id}-video-${index}`}
                    className="h-[420px] w-[82vw] max-w-[360px] shrink-0 overflow-hidden rounded-[28px] border border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.09)]"
                  >
                    <div className="relative aspect-video bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`}
                        alt={item.title || item.candidateName || "Candidate testimonial"}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-[#071014]/20" />
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedVideo({
                            title: item.title || item.candidateName || "Success Story",
                            videoUrl: item.videoUrl,
                          })
                        }
                        className="absolute inset-0 flex items-center justify-center"
                        aria-label={`Play ${item.title || item.candidateName || "testimonial"} video`}
                      >
                        <span className="flex h-16 w-16 items-center justify-center rounded-full bg-white/92 text-[#0f7896] shadow-lg transition hover:scale-105">
                          <CirclePlay className="h-8 w-8" />
                        </span>
                      </button>
                      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/92 px-3 py-1 text-xs font-semibold text-[#071014]">
                        <CirclePlay className="h-3.5 w-3.5 text-[#0f7896]" />
                        Video Testimonial
                      </div>
                    </div>

                    <div className="flex h-[218px] flex-col justify-between p-6">
                      <div className="flex items-start gap-3">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.candidateName || item.title || "Candidate"}
                            className="h-12 w-12 rounded-2xl object-cover"
                          />
                        ) : null}
                        <div>
                          <p className="text-base font-bold text-[#071014]">
                            {item.candidateName || item.title || "Candidate"}
                          </p>
                          {item.companyName ? (
                            <p className="mt-1 text-sm italic text-[#0f7896]">
                              {item.companyName}
                            </p>
                          ) : null}
                          {(item.candidateRole || item.title) ? (
                            <p className="mt-1 text-sm text-[#0f7896]">
                              {item.candidateRole || item.title}
                            </p>
                          ) : null}
                        </div>
                      </div>

                      <p className="line-clamp-2 text-[15px] leading-7 text-[#071014]">
                        {item.quote}
                      </p>

                      <button
                        type="button"
                        onClick={() =>
                          setSelectedVideo({
                            title: item.title || item.candidateName || "Success Story",
                            videoUrl: item.videoUrl,
                          })
                        }
                        className="inline-flex items-center gap-2 rounded-full border border-[#0f7896]/15 bg-white px-4 py-2 text-sm font-semibold text-[#0f7896] shadow-sm transition hover:border-[#0f7896]/30 hover:bg-[#0f7896]/5"
                      >
                        <CirclePlay className="h-4 w-4" />
                        Watch Story
                      </button>
                    </div>
                  </article>
                ) : (
                  <article
                    key={`${item.id}-quote-${index}`}
                    className="relative h-[420px] w-[82vw] max-w-[360px] shrink-0 overflow-hidden rounded-[28px] border border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.09)]"
                  >
                    <span className="pointer-events-none absolute -left-3 -top-6 text-[180px] font-black leading-none text-[#0f7896]/10">
                      "
                    </span>

                    <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[#0f7896]/10" />

                    <div className="relative flex h-full flex-col justify-center p-6">
                      <div className="inline-flex w-fit items-center gap-2 rounded-full bg-[#0f7896]/8 px-3 py-1 text-xs font-semibold text-[#0f7896]">
                        <Quote className="h-3.5 w-3.5" />
                        Candidate Testimonial
                      </div>

                      <p className="mt-5 line-clamp-2 text-[15px] leading-7 text-[#071014]">
                        {item.quote}
                      </p>

                      <div className="mt-6 flex items-start gap-3">
                        {item.imageUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={item.imageUrl}
                            alt={item.candidateName || item.title || "Candidate"}
                            className="h-12 w-12 rounded-2xl object-cover"
                          />
                        ) : null}
                        <div>
                          <p className="text-sm font-bold text-[#071014]">
                            {item.candidateName || item.title || "Candidate"}
                          </p>
                          {item.companyName ? (
                            <p className="mt-1 text-sm italic text-[#0f7896]">
                              {item.companyName}
                            </p>
                          ) : null}
                          {(item.candidateRole || item.title) ? (
                            <p className="mt-1 text-sm text-[#0f7896]">
                              {item.candidateRole || item.title}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    </div>
                  </article>
                )
              ))}
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
