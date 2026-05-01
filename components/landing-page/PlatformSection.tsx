import { ChevronRight } from "lucide-react";
import { features } from "@/components/landing-page/data";
import { panelClass } from "@/components/landing-page/theme";

export function PlatformSection() {
  return (
    <section id="platform" className="px-6 py-24">
      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-sm uppercase tracking-[0.24em] text-[#e7d39f]/76">Platform stack</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              Built like a high-value learning system with assessment depth.
            </h2>
          </div>
          <p className="max-w-xl text-sm leading-7 text-white/58">
            The product should communicate both sides clearly: strong educational structure and the kind of advanced
            tooling that makes preparation feel more measurable.
          </p>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {features.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.title}
                className={`${panelClass} ${item.span} p-6 transition duration-300 hover:-translate-y-1 hover:border-[rgba(237,219,169,0.28)]`}
              >
                <div className={`absolute inset-0 bg-gradient-to-br ${item.tone}`} />
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl border border-[rgba(214,190,130,0.18)] bg-[rgba(214,190,130,0.08)] text-[#f1dfaf]">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/28" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">{item.title}</h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-white/60">{item.text}</p>
                  <div className="mt-5 flex flex-wrap gap-2">
                    {item.points.map((point) => (
                      <span
                        key={point}
                        className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-xs text-[#d9e3f6]/72"
                      >
                        {point}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
