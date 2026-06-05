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

const QUOTE_PREVIEW_LENGTH = 150;

function getQuotePreview(quote: string, maxLength = QUOTE_PREVIEW_LENGTH) {
  const trimmedQuote = quote.trim();

  if (trimmedQuote.length <= maxLength) {
    return {
      text: trimmedQuote,
      isTruncated: false,
    };
  }

  const preview = trimmedQuote.slice(0, maxLength).replace(/\s+\S*$/, "");

  return {
    text: preview || trimmedQuote.slice(0, maxLength),
    isTruncated: true,
  };
}

function TestimonialQuote({
  quote,
  isExpanded,
  hasImage,
  onToggle,
}: {
  quote: string;
  isExpanded: boolean;
  hasImage?: boolean;
  onToggle: () => void;
}) {
  const preview = getQuotePreview(quote, !isExpanded && hasImage ? 110 : QUOTE_PREVIEW_LENGTH);
  const shouldShowToggle = preview.isTruncated || isExpanded;
  const displayText = isExpanded ? quote.trim() : preview.text;

  return (
    <p className="text-[15px] leading-7 text-[#071014]">
      {displayText}
      {!isExpanded && preview.isTruncated ? "... " : " "}
      {shouldShowToggle ? (
        <button
          type="button"
          onClick={onToggle}
          className="font-medium text-[#0f7896] underline underline-offset-4 transition hover:text-[#0b6078]"
        >
          {isExpanded ? "Show less" : "Read more"}
        </button>
      ) : null}
    </p>
  );
}

function TestimonialScreenshot({
  imageUrl,
  alt,
  isExpanded,
}: {
  imageUrl: string;
  alt: string;
  isExpanded: boolean;
}) {
  return (
    <div className="overflow-hidden rounded-[24px] border border-[#0f7896]/10 bg-slate-50">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageUrl}
        alt={alt}
        className={`w-full ${isExpanded ? "max-h-[520px] object-contain" : "h-[140px] object-cover"}`}
      />
    </div>
  );
}

export function SuccessStoriesSection() {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
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
    <section id="stories" className="bg-cyan-50 py-16 sm:py-24">
      <div className="mx-auto mb-12 max-w-7xl px-4 text-center sm:px-6">
        <h2 className="text-3xl font-extrabold tracking-tight text-[#071014] sm:text-6xl">
          Success <span className="text-[#0f7896]">Stories</span>
        </h2>
      </div>

      {testimonials.length > 0 ? (
        <div className="group overflow-hidden pb-4">
          <div className="success-marquee flex w-max gap-5 pr-2 group-hover:[animation-play-state:paused]">
            {marqueeTestimonials.map((item, index) => {
              const isExpanded = expandedStoryId === item.id;

              return item.videoUrl ? (
                <article
                  key={`${item.id}-video-${index}`}
                  className="w-[82vw] max-w-[360px] shrink-0 overflow-hidden rounded-[28px] border border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.09)]"
                >
                  <div className="relative aspect-video bg-slate-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`}
                      alt={item.title || item.candidateName || "Success story"}
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
                      aria-label={`Play ${item.title || item.candidateName || "success story"} video`}
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

                  <div className="flex min-h-[210px] flex-col gap-5 p-6">
                    {item.imageUrl ? (
                      <TestimonialScreenshot
                        imageUrl={item.imageUrl}
                        alt={item.title || item.candidateName || "Success story screenshot"}
                        isExpanded={isExpanded}
                      />
                    ) : null}

                    <TestimonialQuote
                      quote={item.quote}
                      isExpanded={isExpanded}
                      hasImage={Boolean(item.imageUrl)}
                      onToggle={() =>
                        setExpandedStoryId((current) => (current === item.id ? null : item.id))
                      }
                    />

                    <div className="mt-auto flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[#071014]">
                          {item.candidateName || item.title || "Candidate"}
                        </p>
                        {item.companyName ? (
                          <p className="mt-1 text-sm italic text-[#0f7896]">{item.companyName}</p>
                        ) : null}
                        {(item.title || item.candidateRole) ? (
                          <p className="mt-1 text-sm text-[#071014]/70">
                            {item.title || item.candidateRole}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              ) : (
                <article
                  key={`${item.id}-quote-${index}`}
                  className="relative w-[82vw] max-w-[360px] shrink-0 overflow-hidden rounded-[28px] border border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.09)]"
                >
                  <span className="pointer-events-none absolute -left-3 -top-6 text-[180px] font-black leading-none text-[#0f7896]/10">
                    &quot;
                  </span>

                  <div className="absolute -bottom-10 -right-10 h-32 w-32 rounded-full bg-[#0f7896]/10" />

                  <div className="relative flex min-h-[320px] flex-col gap-5 p-6">
                    <div className="inline-flex w-fit items-center gap-2 text-[#0f7896]">
                      <Quote className="h-4 w-4" />
                    </div>

                    {item.imageUrl ? (
                      <TestimonialScreenshot
                        imageUrl={item.imageUrl}
                        alt={item.title || item.candidateName || "Success story screenshot"}
                        isExpanded={isExpanded}
                      />
                    ) : null}

                    <TestimonialQuote
                      quote={item.quote}
                      isExpanded={isExpanded}
                      hasImage={Boolean(item.imageUrl)}
                      onToggle={() =>
                        setExpandedStoryId((current) => (current === item.id ? null : item.id))
                      }
                    />

                    <div className="mt-auto flex items-end justify-between gap-4">
                      <div className="min-w-0">
                        <p className="text-base font-bold text-[#071014]">
                          {item.candidateName || item.title || "Candidate"}
                        </p>
                        {item.companyName ? (
                          <p className="mt-1 text-sm italic text-[#0f7896]">{item.companyName}</p>
                        ) : null}
                        {(item.title || item.candidateRole) ? (
                          <p className="mt-1 text-sm text-[#071014]/70">
                            {item.title || item.candidateRole}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="rounded-[28px] border border-[#0f7896]/12 bg-white px-6 py-10 text-center shadow-[0_16px_40px_rgba(15,120,150,0.09)]">
            <h3 className="text-lg font-semibold text-[#071014]">
              Testimonials will appear here soon
            </h3>
            <p className="mt-2 text-sm text-[#0f7896]">
              Add candidate success stories from the dashboard to populate this section.
            </p>
          </div>
        </div>
      )}

      <VideoPlayerLayout video={selectedVideo} onClose={() => setSelectedVideo(null)} />
    </section>
  );
}
