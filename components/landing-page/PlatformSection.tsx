"use client";

import { features } from "@/components/landing-page/data";
import { ExpandableCardGrid } from "@/components/landing-page/ExpandableCardGrid";

export function PlatformSection() {
  return (
    <section id="platform" className="bg-gradient-to-b from-cyan-50/40 to-white px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-20 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-[#071014] sm:text-6xl">
            App Based <span className="bg-gradient-to-r from-[#0f7896] to-[#1294ba] bg-clip-text text-transparent">Course</span>
          </h2>
        </div>

        <ExpandableCardGrid items={features} />
      </div>
    </section>
  );
}
