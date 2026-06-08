"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, Youtube } from "lucide-react";

const youtubeChannelUrl = "https://www.youtube.com/@ankitgoel2863";
const publicVivaUrl =
  "https://testing-zone-five.vercel.app/public-viva/Z7WYvsCNVLRSpWr19PTY?mode=calm&source=ai-viva-cases";

const aiVivaPoints = [
  "AI Urology Mentor",
  "Experiment different examiners temperament",
  "Choose your examiner from the credits",
  "More than 100+ AI Viva Scenarios",
  "Personalised feedback scoring after each viva",
  "Monitor your progress during FRCS preparation",
];

export function AiVivaSection() {
  const [countdown, setCountdown] = useState(0);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;

    const timer = window.setTimeout(() => {
      setCountdown((current) => {
        const next = current - 1;
        if (next <= 0) {
          setIsUnlocked(true);
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown]);

  const handleSubscribeClick = () => {
    window.open(youtubeChannelUrl, "_blank", "noopener,noreferrer");
    setIsUnlocked(false);
    setCountdown(15);
  };

  return (
    <section
      id="ai-viva"
      className="overflow-hidden bg-gradient-to-b from-cyan-50/30 to-white px-4 py-16 sm:px-6 sm:py-24"
    >
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#071014] sm:text-6xl">
            Urologics{" "}
            <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">
              AI Viva
            </span>
          </h2>
        </div>

        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="grid gap-4 sm:grid-cols-2">
            {aiVivaPoints.map((point, index) => {
              const colors = ["#0f7896", "#e6a63a", "#7c6ee6"];
              const color = colors[index % 3];

              return (
                <div
                  key={point}
                  className="group rounded-[28px] border border-slate-100/80 bg-white/80 p-7 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all duration-300 hover:-translate-y-2 hover:border-[#0f7896]/20 hover:shadow-[0_20px_48px_rgba(15,120,150,0.12)]"
                >
                  <p className="text-lg font-bold leading-snug tracking-[-0.02em] text-[#071014] sm:text-xl">
                    {point}
                  </p>

                  <div
                    className="mt-5 h-1.5 w-10 rounded-full"
                    style={{ backgroundColor: color }}
                  />
                </div>
              );
            })}
          </div>

          <div className="relative">
            <div className="relative overflow-hidden rounded-[32px] shadow-[0_22px_70px_rgba(15,120,150,0.16)]">
              <Image
                src="/my-mentor-ai.webp"
                alt="Urologics AI Viva laptop preview"
                width={1200}
                height={800}
                sizes="(min-width: 1024px) 590px, 100vw"
                className="h-auto w-full object-contain"
              />
            </div>

            <div className="mt-7 flex flex-col items-center gap-4">
              <button
                type="button"
                onClick={handleSubscribeClick}
                className="inline-flex items-center gap-3 rounded-full border border-[#0f7896]/16 bg-white px-6 py-4 text-sm font-bold text-[#0f7896] shadow-[0_12px_30px_rgba(15,120,150,0.12)] transition hover:-translate-y-0.5 hover:border-[#0f7896]/28 hover:bg-cyan-50"
              >
                <span className="grid h-10 w-10 place-items-center rounded-full bg-red-50 text-red-600">
                  <Youtube className="h-5 w-5" />
                </span>
                <span>
                  {countdown > 0
                    ? `Subscribed? Unlocking in ${countdown}s`
                    : "Subscribe to Youtube to get a free viva access"}
                </span>
              </button>

              {isUnlocked ? (
                <Link
                  href={publicVivaUrl}
                  className="group inline-flex items-center gap-3 rounded-full bg-gradient-to-r from-[#0f7896] to-[#1294ba] px-8 py-4 text-base font-extrabold text-white shadow-[0_16px_42px_rgba(15,120,150,0.28)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_58px_rgba(15,120,150,0.36)]"
                >
                  Try AI Viva Now
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/18 transition group-hover:translate-x-0.5 group-hover:bg-white/25">
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                </Link>
              ) : (
                <button
                  type="button"
                  disabled
                  className="inline-flex cursor-not-allowed items-center gap-3 rounded-full bg-slate-200 px-8 py-4 text-base font-extrabold text-slate-500 opacity-80"
                >
                  Try AI Viva Now
                  <span className="grid h-9 w-9 place-items-center rounded-full bg-white/60">
                    <ArrowUpRight className="h-5 w-5" />
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
