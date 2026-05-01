import { GraduationCap } from "lucide-react";
import { DirectionCard } from "@/components/landing-page/primitives";
import { panelClass } from "@/components/landing-page/theme";

export function MentorSection() {
  return (
    <section id="mentor" className="px-6 py-24">
      <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
        <div className={`${panelClass} p-5`}>
          <div className="relative overflow-hidden rounded-[28px] border border-[rgba(214,190,130,0.14)] bg-[linear-gradient(180deg,#0a1f3a,#06111f)] p-6">
            <div className="relative flex min-h-[360px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.025] text-center">
              <div className="max-w-xs space-y-3">
                <div className="mx-auto grid h-20 w-20 place-items-center rounded-full border border-[rgba(214,190,130,0.18)] bg-[rgba(214,190,130,0.08)] text-[#efdca8]">
                  <GraduationCap className="h-9 w-9" />
                </div>
                <p className="text-lg font-semibold text-white">Dr. Ankit Goel</p>
                <p className="text-sm leading-7 text-white/55">Mentor or founder visual area for your final branded asset.</p>
              </div>
            </div>
          </div>
        </div>

        <div className={`${panelClass} p-8`}>
          <p className="text-sm uppercase tracking-[0.24em] text-[#e7d39f]/76">Academic direction</p>
          <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
            Made under the direction of Dr. Ankit Goel.
          </h2>
          <p className="mt-4 text-lg leading-8 text-[#d2dbef]/66">
            The product should feel clinically grounded, premium in execution, and confident in its academic tone. That
            combination matters when the audience is preparing for a serious exam.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <DirectionCard title="Serious visual language" text="Dark, premium, credible surfaces rather than bright generic edtech styling." />
            <DirectionCard title="Clear perceived value" text="Every section should quickly answer why this is useful for a committed FRCS candidate." />
            <DirectionCard title="Technology with purpose" text="Analytics, AI viva, and gated content should feel like meaningful infrastructure." />
            <DirectionCard title="Better exam readiness" text="Everything points back to preparation quality, confidence, and final performance." />
          </div>
        </div>
      </div>
    </section>
  );
}
