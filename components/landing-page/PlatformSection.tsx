"use client";

import { ArrowUpRight, Check, Smartphone, X } from "lucide-react";
import { useState } from "react";
import { features } from "@/components/landing-page/data";

export function PlatformSection() {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  return (
    <section id="platform" className="bg-cyan-50 px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col items-center text-center">
          {/* <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#0f7896] text-white shadow-[0_16px_36px_rgba(15,120,150,0.25)]">
            <Smartphone className="h-6 w-6" />
          </div> */}

          <h2 className="max-w-3xl px-4 text-5xl font-semibold tracking-[-0.04em] text-[#071014] sm:text-5xl">
            App-based Courses.
          </h2>
        </div>

        <div className="grid  gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((item) => {
            const isActive = activeCard === item.title;

            return (
              <div
  key={item.title}
  className={`group relative flex flex-col rounded-[28px] p-6 shadow-[0_16px_40px_rgba(15,120,150,0.09)] transition-all duration-500 ${
  isActive
    ? "bg-[#0f7896] text-white shadow-[0_24px_65px_rgba(15,120,150,0.25)] sm:col-span-2"
    : "min-h-[180px] border border-[#0f7896]/12 bg-white text-[#071014] hover:-translate-y-1 hover:border-[#0f7896]/28"
}`}
>
                {/* Close button */}
                {isActive && (
  <button
    onClick={() => setActiveCard(null)}
    className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white hover:text-[#0f7896]"
  >
    <X className="h-4 w-4" />
  </button>
)}

                {/* Title */}
                <h3
  className={`font-semibold tracking-[-0.04em] transition-all duration-300 ${
    isActive
      ? "text-3xl text-white"
      : "text-2xl text-center my-auto text-[#071014]"
  }`}
>
  {item.title}
</h3>

                {/* Expanded content */}
         {isActive && (
  <div className="mt-7 grid gap-3 sm:grid-cols-2">
    {item.textPoints?.map((point, index) => (
      <div
        key={point}
        className="relative overflow-hidden rounded-[18px] border border-white/18 bg-white p-4 text-[#071014] shadow-[0_10px_26px_rgba(0,0,0,0.08)]"
      >
        <div className="absolute right-0 top-0 h-12 w-12 rounded-bl-[22px] bg-[#0f7896]/10" />

        <div className="flex items-start gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0f7896] text-sm font-bold text-white">
            {index + 1}
          </div>

          <p className="text-lg font-bold leading-7 tracking-[-0.03em] text-[#071014]">
            {point}
          </p>
        </div>
      </div>
    ))}
  </div>
)}

                {/* Explore button (only when collapsed) */}
                {!isActive && (
                  <button
                    onClick={() => setActiveCard(item.title)}
                    className="mt-auto mx-auto inline-flex items-center gap-2 rounded-full border border-[#0f7896]/20 px-4 py-2 text-sm font-semibold text-[#0f7896] transition duration-300 group-hover:bg-[#0f7896] group-hover:text-white"
                  >
                    Explore
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}