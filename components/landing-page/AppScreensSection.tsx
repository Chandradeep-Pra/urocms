"use client";

import Image from "next/image";
import type { ComponentType } from "react";
import { useEffect, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Focus,
  ImageIcon,
  Laptop,
  Layers3,
  ShieldCheck,
  Tablet,
  Zap,
} from "lucide-react";

const accent = "text-[#0f7896]";

const dailyPoints = [
  {
    icon: CalendarDays,
    text: "1 Daily Question Everyday",
  },
  {
    icon: Focus,
    text: "FRCS Urology Focused",
  },
  {
    icon: Download,
    text: "Download and Review Anytime",
  },
  {
    icon: ShieldCheck,
    text: "Stay Connected Stay Ahead",
  },
];

const tabletShowcases = [
  {
    title: "Mini Mock Test",
    image: "/ipad-portrait.png",
    width: 433,
    height: 577,
    icon: Tablet,
    className: "max-w-[420px]",
  },
  {
    title: "Chapter Wise",
    image: "/ipad-hori.png",
    width: 577,
    height: 433,
    icon: Layers3,
    className: "max-w-[760px]",
  },
  {
    title: "Image Based Question",
    image: "/ipad-hori-2.png",
    width: 577,
    height: 433,
    icon: ImageIcon,
    className: "max-w-[760px]",
  },
];

function ShowcaseTitle({
  title,
  icon: Icon,
}: {
  title: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="mb-4 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#0f7896]/70">
        Urologics
      </p>
      <h3 className="mt-2 flex items-center justify-center gap-2 text-3xl font-extrabold tracking-[-0.04em] text-[#071014]">
        <Icon className={`h-8 w-8 ${accent}`} />
        <span>{title}</span>
      </h3>
    </div>
  );
}

function MacbookMockup() {
  return (
    <div className="relative mx-auto w-full max-w-[900px]">
      <div className="absolute left-[9.2%] top-[2%] h-[90.5%] w-[81.6%] overflow-hidden rounded-t-[12px] bg-cyan-50">
        <Image
          src="/macbook-screen.png"
          alt="Grand mock test screen"
          fill
          className="object-cover object-top"
          sizes="(min-width: 1024px) 734px, 86vw"
        />
      </div>
      <Image
        src="/macbook-mockup.png"
        alt="MacBook mockup"
        width={750}
        height={431}
        className="relative z-10 h-auto w-full"
        priority={false}
      />
    </div>
  );
}

function DailyQuickQuestionItem() {
  return (
    <div className="grid w-full max-w-[900px] grid-cols-[0.46fr_0.54fr] items-center gap-4 sm:flex sm:flex-row sm:gap-10">
      <Image
        src="/daily-quiz-device.png"
        alt="Daily quiz app screen"
        width={450}
        height={920}
        className="h-auto w-full max-w-[138px] justify-self-end sm:max-w-[330px]"
        priority={false}
      />

      <div className="min-w-0 flex-1">
        <div className="mb-3 text-left sm:mb-7">
          <p className="text-xs font-bold uppercase tracking-[0.32em] text-[#0f7896]/70">
            Urologics
          </p>
          <h2 className="mt-2 flex items-center gap-1.5 whitespace-normal text-2xl font-extrabold tracking-[-0.05em] text-[#071014] sm:gap-2 sm:text-4xl">
            <Zap className="h-6 w-6 shrink-0 text-[#0f7896] sm:h-10 sm:w-10" />
            <span>Daily Quick Question</span>
          </h2>
        </div>

        <div className="space-y-2 sm:space-y-4">
          {dailyPoints.map((point) => {
            const PointIcon = point.icon;

            return (
              <div key={point.text} className="flex items-center gap-2 sm:gap-4">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#0f7896]/15 bg-cyan-50 sm:h-12 sm:w-12">
                  <PointIcon className="h-4 w-4 text-[#0f7896] sm:h-7 sm:w-7" />
                </span>
                <p className="text-xs font-bold leading-snug text-[#071014] sm:text-base">
                  {point.text}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function MacbookShowcaseItem() {
  return (
    <div className="w-full max-w-[940px]">
      <ShowcaseTitle title="Grand Mock Test" icon={Laptop} />
      <MacbookMockup />
    </div>
  );
}

function TabletShowcaseItem({
  item,
}: {
  item: (typeof tabletShowcases)[number];
}) {
  return (
    <div className="flex w-full max-w-[880px] flex-col items-center">
      <ShowcaseTitle title={item.title} icon={item.icon} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.image}
        alt={`${item.title} app mockup`}
        width={item.width}
        height={item.height}
        className={`block h-auto w-full ${item.className}`}
      />
    </div>
  );
}

export function AppScreensSection() {
  const [activeIndex, setActiveIndex] = useState(0);
  const slideCount = 5;

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveIndex((current) => (current + 1) % slideCount);
    }, 2500);

    return () => window.clearInterval(timer);
  }, []);

  const goToPrevious = () => {
    setActiveIndex((current) => (current - 1 + slideCount) % slideCount);
  };

  const goToNext = () => {
    setActiveIndex((current) => (current + 1) % slideCount);
  };

  const slides = [
    <DailyQuickQuestionItem key="daily" />,
    <MacbookShowcaseItem key="macbook" />,
    ...tabletShowcases.map((item) => (
      <TabletShowcaseItem key={item.title} item={item} />
    )),
  ];

  return (
    <section className="bg-white px-6 py-24">
      <div className=" text-center">
          <h2 className="text-5xl font-extrabold tracking-tight text-[#071014] sm:text-6xl">
            Question <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">banks</span>
          </h2>
        </div>

      <div className="mx-auto max-w-[1240px]">
        <div className="relative overflow-hidden  sm:px-16">
          <button
            type="button"
            onClick={goToPrevious}
            aria-label="Previous screen"
            className="absolute left-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0f7896]/15 bg-white text-[#0f7896] shadow-[0_12px_30px_rgba(15,120,150,0.12)] transition hover:-translate-x-0.5 hover:bg-cyan-50"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>

          <button
            type="button"
            onClick={goToNext}
            aria-label="Next screen"
            className="absolute right-4 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#0f7896]/15 bg-white text-[#0f7896] shadow-[0_12px_30px_rgba(15,120,150,0.12)] transition hover:translate-x-0.5 hover:bg-cyan-50"
          >
            <ChevronRight className="h-5 w-5" />
          </button>

          <div className="overflow-hidden">
            <div
              className="flex transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]"
              style={{ transform: `translateX(-${activeIndex * 100}%)` }}
            >
              {slides.map((slide, index) => (
                <div
                  key={index}
                  className="flex min-h-[520px] w-full shrink-0 items-center justify-center"
                >
                  {slide}
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-2 flex justify-center gap-3">
          {Array.from({ length: slideCount }).map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              aria-label={`Go to screen ${index + 1}`}
              className={`h-3 rounded-full transition-all duration-300 ${
                activeIndex === index
                  ? "w-10 bg-[#0f7896]"
                  : "w-3 bg-[#0f7896]/20 hover:bg-[#0f7896]/45"
              }`}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
