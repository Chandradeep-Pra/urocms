import { ChevronRight } from "lucide-react";
import { features } from "@/components/landing-page/data";

export function PlatformSection() {
  return (
    <section id="platform" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            
            <h2 className="mt-4 text-4xl font-semibold text-center  tracking-[-0.04em] text-white sm:text-5xl">
              App Based Courses
            </h2>
          </div>
        </div>

        <div className="gold-scrollbar flex gap-4  px-1 pb-4 pt-2">
          {features.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className="relative min-w-[220px] shrink-0 overflow-hidden rounded-[32px] border border-[rgba(241,219,159,0.72)] bg-[linear-gradient(180deg,#f4df9f,#d9b559)] p-5 shadow-none transition duration-300 hover:-translate-y-1 hover:border-[#fff1c7] sm:min-w-[240px]"
              >
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,245,214,0.55),transparent_48%,rgba(170,125,34,0.18))]" />
                <div className="absolute inset-x-5 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,249,232,0.95),transparent)]" />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[rgba(8,26,49,0.16)] bg-[rgba(12,44,83,0.1)] text-[#0c2c53] shadow-[inset_0_1px_0_rgba(255,255,255,0.18)]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-[#0c2c53]/60" />
                  </div>
                  <h3 className="mt-5 text-lg font-semibold tracking-[-0.03em] text-[#0c2c53]">
                    {item.title}
                  </h3>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
