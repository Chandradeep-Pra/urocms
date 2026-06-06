"use client";

import { ArrowUpRight, X } from "lucide-react";
import { useState } from "react";

export type ExpandableCardItem = {
  title: string;
  textPoints?: string[];
};

function getExpandedPlacementClass(index: number) {
  const expandsLeftOnMedium = index % 2 === 1;
  const expandsLeftOnWide = index % 4 === 3;

  return [
    expandsLeftOnMedium ? "md:[grid-column:1/span_2]" : "md:col-span-2",
    expandsLeftOnWide ? "xl:[grid-column:3/span_2]" : "xl:col-span-2",
  ].join(" ");
}

export function ExpandableCardGrid({ items }: { items: ExpandableCardItem[] }) {
  const [activeCard, setActiveCard] = useState<string | null>(null);

  return (
    <div className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-4">
      {items.map((item, index) => {
        const isActive = activeCard === item.title;

        return (
          <div
            key={item.title}
            className={`group relative flex flex-col rounded-[32px] py-8 px-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
              isActive
                ? `min-h-[360px] scale-[1.02] border border-[#0f7896]/20 bg-gradient-to-br from-[#0f7896] to-[#1294ba] text-white shadow-[0_24px_65px_rgba(15,120,150,0.35)] ${getExpandedPlacementClass(index)}`
                : "min-h-[220px] border border-slate-100/80 bg-white/80 text-[#071014] shadow-[0_8px_30px_rgb(0,0,0,0.03)] backdrop-blur-md hover:-translate-y-2 hover:border-[#0f7896]/30 hover:shadow-[0_20px_48px_rgba(15,120,150,0.12)]"
            }`}
          >
            {isActive && (
              <button
                type="button"
                onClick={() => setActiveCard(null)}
                aria-label={`Close ${item.title}`}
                className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/20 text-white transition hover:bg-white hover:text-[#0f7896]"
              >
                <X className="h-4 w-4" />
              </button>
            )}

            <h3
              className={`font-bold tracking-tight transition-all duration-300 ${
                isActive
                  ? "mb-4 text-2xl text-white"
                  : "my-auto text-center text-2xl text-[#071014]"
              }`}
            >
              {item.title}
            </h3>

            {isActive && (
              <div className="mt-7 grid gap-3 md:grid-cols-2 animate-in fade-in slide-in-from-top-2 duration-300">
                {item.textPoints?.map((point, pointIndex) => (
                  <div
                    key={point}
                    className="relative overflow-hidden rounded-[20px] border border-white/20 bg-white/10 p-5 text-white shadow-[0_10px_30px_rgba(0,0,0,0.1)] backdrop-blur-md transition-transform hover:-translate-y-1"
                  >
                    <div className="absolute right-0 top-0 h-16 w-16 rounded-bl-[32px] bg-white/10" />

                    <div className="flex items-start gap-4">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-sm font-extrabold text-[#0f7896] shadow-sm">
                        {pointIndex + 1}
                      </div>

                      <p className="text-lg font-semibold leading-7 tracking-[-0.02em] text-white">
                        {point}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isActive && (
              <button
                type="button"
                onClick={() => setActiveCard(item.title)}
                className="mx-auto mt-auto inline-flex items-center gap-2 rounded-full bg-[#0f7896]/5 px-5 py-2.5 text-sm font-bold text-[#0f7896] transition duration-300 group-hover:bg-[#0f7896] group-hover:text-white"
              >
                Explore
                <ArrowUpRight className="h-4 w-4" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
