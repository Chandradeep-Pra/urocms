"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { goldGradient } from "@/components/landing-page/theme";

function lerp(start: number, end: number, progress: number) {
  return start + (end - start) * progress;
}

export function LandingHeader() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const next = Math.min(Math.max(window.scrollY / 120, 0), 1);
      setProgress(next);
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const isCompact = progress > 0.98;
  const backgroundAlpha = lerp(0.84, 0, progress);
  const blurPx = lerp(24, 0, progress);
  const dividerOpacity = 1 - progress;
  const goldLineOpacity = lerp(0.8, 0, progress);
  const goldGlowOpacity = lerp(0.7, 0, progress);
  const goldLineWidth = lerp(980, 0, progress);
  const goldGlowWidth = lerp(316, 0, progress);
  const wrapperPaddingY = lerp(16, 12, progress);
  const logoShiftX = lerp(0, 14, progress);
  const logoShiftY = lerp(0, 8, progress);
  const logoScale = lerp(1, 1.12, progress);
  const logoSize = lerp(56, 72, progress);
  const titleSize = lerp(1.35, 1.45, progress);
  const sublabelOpacity = 1 - progress;
  const sublabelShiftY = lerp(0, -4, progress);
  const navOpacity = 1 - progress;
  const navShiftY = lerp(0, -8, progress);
  const ctaShiftX = lerp(0, 2, progress);
  const ctaShiftY = lerp(0, 8, progress);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50"
      style={{
        backgroundColor: `rgba(4,10,18,${backgroundAlpha})`,
        backdropFilter: `blur(${blurPx}px)`,
        WebkitBackdropFilter: `blur(${blurPx}px)`,
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-white/5"
        style={{ opacity: dividerOpacity }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-px -translate-x-1/2 bg-[linear-gradient(90deg,transparent,rgba(245,225,176,0.95),rgba(188,137,49,0.95),transparent)]"
        style={{ width: `${goldLineWidth}px`, opacity: goldLineOpacity }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-1/2 h-3 -translate-x-1/2 rounded-full bg-[rgba(206,164,79,0.35)] blur-md"
        style={{ width: `${goldGlowWidth}px`, opacity: goldGlowOpacity }}
      />

      <div className="mx-auto grid max-w-none grid-cols-[auto_1fr_auto] items-center px-4 sm:px-6" style={{ paddingTop: `${wrapperPaddingY}px`, paddingBottom: `${wrapperPaddingY}px` }}>
        <div
          className="flex items-center gap-3 will-change-transform"
          style={{ transform: `translate(${logoShiftX}px, ${logoShiftY}px) scale(${logoScale})` }}
        >
          <div
            className="relative shrink-0 transition-transform duration-300 hover:scale-[1.03]"
            style={{ width: `${logoSize}px`, height: `${logoSize}px` }}
          >
            <Image src="/logo.png" alt="Urologics logo" fill className="object-contain" sizes="72px" />
          </div>
          <div>
            <p className="font-semibold tracking-[-0.04em] text-white" style={{ fontSize: `${titleSize}rem` }}>
              <span className="bg-[linear-gradient(135deg,#fff0c4_0%,#ddbc73_40%,#b6822e_78%,#f1deab_100%)] bg-clip-text text-transparent">
                U
              </span>
              rologics
            </p>
            <p
              className="text-[11px] uppercase tracking-[0.28em] text-[#b9c6dd]/48"
              style={{ opacity: sublabelOpacity, transform: `translateY(${sublabelShiftY}px)` }}
            >
              FRCS Urology Prep OS
            </p>
          </div>
        </div>

        <div className="hidden justify-center md:flex">
          <div
            className="flex items-center gap-8 text-sm text-white/62 will-change-transform"
            style={{
              opacity: navOpacity,
              transform: `translateY(${navShiftY}px)`,
              pointerEvents: isCompact ? "none" : "auto",
            }}
          >
            <a href="#why" className="transition hover:text-[#f0dfb0]">
              Why Urologics
            </a>
            <a href="#platform" className="transition hover:text-[#f0dfb0]">
              Platform
            </a>
            <a href="#ai-viva" className="transition hover:text-[#f0dfb0]">
              AI Viva
            </a>
            <Link href="/pricing" className="transition hover:text-[#f0dfb0]">
              Pricing
            </Link>
          </div>
        </div>

        <div
          className="flex items-center justify-self-end gap-3 will-change-transform"
          style={{ transform: `translate(${ctaShiftX}px, ${ctaShiftY}px)` }}
        >
          <Button
            asChild
            variant="outline"
            className="rounded-full border-[rgba(214,190,130,0.24)] bg-white/[0.03] text-[#f5e6bc] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[rgba(214,190,130,0.08)]"
          >
            <Link href="/pricing">View Pricing</Link>
          </Button>
          <Button
            className={`rounded-full border border-[#e8d39b]/30 px-5 text-[#0a1525] shadow-[0_18px_40px_rgba(167,124,44,0.25)] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(167,124,44,0.34)] ${goldGradient}`}
          >
            Get Early Access
          </Button>
        </div>
      </div>
    </header>
  );
}
