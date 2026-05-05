import { Sparkles } from "lucide-react";
import { valuePoints } from "@/components/landing-page/data";
import { panelClass } from "@/components/landing-page/theme";

export function WhySection() {
  return (
    <section id="why" className="px-4 py-16 sm:px-6 sm:py-24">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-10 lg:grid-cols-[0.88fr_1.12fr]">
          <div className="space-y-5">
            <p className="text-sm uppercase tracking-[0.24em] text-[#e7d39f]/76">Why Urologics</p>
            <h2 className="text-3xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              It should feel like a serious exam-prep operating system, not a content dump.
            </h2>
            <p className="text-lg leading-8 text-[#d2dbef]/66">
              The value story becomes stronger when the platform looks structured, advanced, and academically credible.
              Students should see a clearer path from study effort to exam readiness.
            </p>
          </div>

          <div className="grid gap-4">
            {valuePoints.map((item) => (
              <div key={item.title} className={`${panelClass} p-6`}>
                <div className="absolute inset-y-6 left-0 w-px bg-[linear-gradient(180deg,transparent,rgba(233,210,149,0.65),transparent)]" />
                <div className="flex items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl border border-[rgba(214,190,130,0.18)] bg-[linear-gradient(180deg,rgba(214,190,130,0.12),rgba(214,190,130,0.04))] text-[#efdca8]">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-white/60">{item.text}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
