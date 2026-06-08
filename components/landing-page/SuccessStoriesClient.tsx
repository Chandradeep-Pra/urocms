"use client";

import { CirclePlay, Expand, Quote, X } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

const VideoPlayerLayout = dynamic(() => import("@/components/videos/VideoPlayerLayout"), {
  ssr: false,
});

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
        loading="lazy"
        decoding="async"
        className={`w-full ${isExpanded ? "max-h-[520px] object-contain" : "h-[140px] object-cover"}`}
      />
    </div>
  );
}

function getYoutubeThumbnail(item: Testimonial) {
  const youtubeId = item.youtubeId?.trim();

  if (youtubeId) {
    return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  }

  const watchMatch = item.videoUrl?.match(/[?&]v=([^&]+)/);
  if (watchMatch?.[1]) {
    return `https://img.youtube.com/vi/${watchMatch[1]}/hqdefault.jpg`;
  }

  const shortMatch = item.videoUrl?.match(/youtu\.be\/([^?]+)/);
  if (shortMatch?.[1]) {
    return `https://img.youtube.com/vi/${shortMatch[1]}/hqdefault.jpg`;
  }

  return "";
}

function TestimonialDetails({ item }: { item: Testimonial }) {
  return (
    <div className="min-w-0">
      <p className="truncate text-base font-bold text-[#071014]">
        {item.candidateName || item.title || "Candidate"}
      </p>
      {item.companyName ? (
        <p className="mt-1 truncate text-sm italic text-[#0f7896]">{item.companyName}</p>
      ) : null}
      {(item.title || item.candidateRole) ? (
        <p className="mt-1 line-clamp-2 text-sm leading-5 text-[#071014]/70">
          {item.title || item.candidateRole}
        </p>
      ) : null}
    </div>
  );
}

export function SuccessStoriesClient({
  initialTestimonials,
}: {
  initialTestimonials: Testimonial[];
}) {
  const testimonials = initialTestimonials;
  const [expandedStoryId, setExpandedStoryId] = useState<string | null>(null);
  const [selectedVideo, setSelectedVideo] = useState<{
    title: string;
    videoUrl: string;
  } | null>(null);
  const [selectedImage, setSelectedImage] = useState<{
    src: string;
    alt: string;
  } | null>(null);

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
              const hasVideo = Boolean(item.videoUrl || item.youtubeId);
              const hasImage = Boolean(item.imageUrl && !hasVideo);
              const videoThumbnail = getYoutubeThumbnail(item);

              return hasVideo ? (
                <article
                  key={`${item.id}-video-${index}`}
                  className="h-[360px] w-[82vw] max-w-[360px] shrink-0 overflow-hidden rounded-[28px] border border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.09)]"
                >
                  <div className="relative h-[75%] bg-slate-100">
                    {videoThumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={videoThumbnail}
                        alt={item.title || item.candidateName || "Success story"}
                        loading="lazy"
                        decoding="async"
                        className="h-full w-full object-cover"
                      />
                    ) : null}
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

                  <div className="flex h-[25%] items-center border-t border-[#0f7896]/10 px-5 py-3">
                    <TestimonialDetails item={item} />
                  </div>
                </article>
              ) : hasImage ? (
                <article
                  key={`${item.id}-image-${index}`}
                  className="h-[360px] w-[82vw] max-w-[360px] shrink-0 overflow-hidden rounded-[28px] border border-[#0f7896]/12 bg-white shadow-[0_16px_40px_rgba(15,120,150,0.09)]"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setSelectedImage({
                        src: item.imageUrl,
                        alt: item.title || item.candidateName || "Success story image",
                      })
                    }
                    className="group relative flex h-[75%] w-full items-center justify-center bg-slate-50"
                    aria-label={`Open ${item.title || item.candidateName || "success story"} image`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.imageUrl}
                      alt={item.title || item.candidateName || "Success story image"}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-contain"
                    />
                    <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 rounded-full bg-[#071014]/75 px-3 py-1.5 text-xs font-semibold text-white transition group-hover:bg-[#071014]">
                      <Expand className="h-3.5 w-3.5" />
                      View full
                    </span>
                  </button>

                  <div className="flex h-[25%] items-center border-t border-[#0f7896]/10 px-5 py-3">
                    <TestimonialDetails item={item} />
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
                        <TestimonialDetails item={item} />
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

      {selectedVideo ? (
        <VideoPlayerLayout video={selectedVideo} onClose={() => setSelectedVideo(null)} />
      ) : null}
      {selectedImage ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#071014]/90 p-4"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setSelectedImage(null)}
            className="absolute right-4 top-4 inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
            aria-label="Close image preview"
          >
            <X className="h-5 w-5" />
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={selectedImage.src}
            alt={selectedImage.alt}
            className="max-h-[88vh] max-w-[92vw] rounded-[24px] object-contain shadow-2xl"
          />
        </div>
      ) : null}
    </section>
  );
}
