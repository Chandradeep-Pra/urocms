import { Brain, CheckCircle2, FileSpreadsheet, Play, ShieldCheck, Stethoscope } from "lucide-react";
import { panelClass, panelInsetClass, goldGradient } from "@/components/landing-page/theme";
import { TechStat, ValueRow } from "@/components/landing-page/primitives";

export function AiVivaSection() {
  return (
    <section id="ai-viva" className="px-6 py-24">
      <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <div className={`${panelClass} p-8`}>
          <p className="text-sm uppercase tracking-[0.24em] text-[#e7d39f]/76">Signature differentiator</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
            The AI viva layer should make the product feel unmistakably more advanced.
          </h2>
          <p className="mt-4 text-lg leading-8 text-[#d2dbef]/66">
            This is the premium signal. It tells candidates they are not just buying more content, but access to a more
            exam-real practice environment that helps sharpen reasoning under pressure.
          </p>

          <div className="mt-8 space-y-4">
            <ValueRow
              icon={Brain}
              title="Adaptive questioning"
              text="A more dynamic experience than static mock content, with greater perceived realism."
            />
            <ValueRow
              icon={Stethoscope}
              title="Clinical reasoning under pressure"
              text="Practice structured responses, prioritisation, and discipline in how answers are delivered."
            />
            <ValueRow
              icon={ShieldCheck}
              title="Confidence before the real exam"
              text="Repeated high-quality exposure reduces uncertainty and strengthens readiness."
            />
          </div>
        </div>

        <div className={`${panelClass} p-5 sm:p-6`}>
          <div className={`${panelInsetClass} p-5`}>
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[11px] uppercase tracking-[0.24em] text-[#ebd9aa]/70">Simulation frame</p>
                <h3 className="mt-2 text-2xl font-semibold text-white">Ready for your real AI viva recording</h3>
              </div>
              <div className="hidden rounded-full border border-[rgba(214,190,130,0.18)] bg-[rgba(214,190,130,0.08)] px-3 py-1 text-xs text-[#f0deab] sm:block">
                Premium feature
              </div>
            </div>

            <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="relative overflow-hidden rounded-[28px] border border-[rgba(214,190,130,0.14)] bg-[linear-gradient(135deg,#0b1f3c,#071220_54%,#040913)] px-6 py-10">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(214,190,130,0.11),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(85,104,152,0.12),transparent_28%)]" />
                <div className="relative flex min-h-[320px] items-center justify-center">
                  <button
                    className={`grid h-24 w-24 place-items-center rounded-full border border-[#efdfb6]/25 text-[#081321] shadow-[0_24px_70px_rgba(180,134,53,0.32)] transition hover:scale-[1.03] ${goldGradient}`}
                  >
                    <Play className="ml-1 h-8 w-8 fill-current" />
                  </button>
                </div>
              </div>

              <div className="space-y-4">
                <TechStat icon={Brain} title="Mode architecture" text="Calm and rapid viva paths under one case structure." />
                <TechStat
                  icon={FileSpreadsheet}
                  title="Response analysis"
                  text="Candidate performance can feed reporting, ranking, and review."
                />
                <TechStat
                  icon={CheckCircle2}
                  title="High conversion signal"
                  text="This is where the product starts to feel distinct and premium."
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
