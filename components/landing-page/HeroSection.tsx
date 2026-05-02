import { Apple, CirclePlay, Laptop, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  panelClass,
  chipClass,
  goldGradient,
} from "@/components/landing-page/theme";
import {
  HeroMetric,
  LandingBadge,
  PhoneMock,
} from "@/components/landing-page/primitives";

export function HeroSection() {
  return (
    <section className="relative px-6 pb-24 pt-16 sm:pt-20">
      <div className="mx-auto grid max-w-7xl items-start gap-14 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="animate-slide-up space-y-8">
          {/* <div className="flex flex-wrap gap-3">
            <span className={chipClass}>Advanced prep for FRCS candidates</span>
            <span className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] px-3 py-1 text-[11px] uppercase tracking-[0.22em] text-white/62">
              Under the direction of Dr. Ankit Goel
            </span>
          </div> */}

          <div className="space-y-6">
            <h1 className="max-w-4xl text-5xl font-semibold leading-[0.92] tracking-[-0.06em] text-white sm:text-6xl lg:text-[78px]">
              World's First #
              <span
                className={`mt-2 block bg-clip-text text-transparent ${goldGradient}`}
              >
                App based Learning Platform for FRCS Urology
              </span>
            </h1>
            <span className={chipClass}>Powered by Urologics AI</span>

            
          </div>

          {/* <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr]">
            <div className={`${panelClass} p-5`}>
              <div className="absolute inset-x-6 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(233,210,149,0.7),transparent)]" />
              <p className="text-[11px] uppercase tracking-[0.24em] text-[#ebd9aa]/78">Why it converts</p>
              <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">
                Students should instantly feel: this will help me perform better.
              </p>
              <div className="mt-5 flex flex-wrap gap-3 text-sm text-white/62">
                <LandingBadge text="Real progress visibility" />
                <LandingBadge text="Exam-style practice depth" />
                <LandingBadge text="AI-led viva edge" />
              </div>
            </div>

            <div className={`${panelClass} p-5`}>
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.24em] text-[#ebd9aa]/78">Academic signal</p>
                  <p className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-white">Built with seriousness.</p>
                </div>
                <div className="grid h-11 w-11 place-items-center rounded-2xl border border-[rgba(214,190,130,0.2)] bg-[rgba(214,190,130,0.08)] text-[#eed79b]">
                  <GraduationCap className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-4 text-sm leading-7 text-white/60">
                Designed to feel closer to a premium clinical learning system than a generic edtech app.
              </p>
            </div>
          </div> */}

          <div className="flex flex-wrap gap-4">
            <Button
              className={`rounded-full border border-[#eddba9]/30 px-7 py-6 text-[#081321] shadow-[0_18px_45px_rgba(171,131,49,0.28)] ${goldGradient}`}
            >
              Join Waitlist
            </Button>
            <Button
              variant="outline"
              className="rounded-full border-white/10 bg-white/[0.03] px-6 py-6 text-base text-white hover:bg-white/[0.07]"
            >
              <CirclePlay className="mr-2 h-4 w-4 text-[#ecd79f]" />
              Watch AI Viva Demo
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <HeroMetric
              label="iOS Store"
              valueIcon={Apple}
            />
            <HeroMetric
              label="Play Store"
              valueIcon={Smartphone}
            />
            <HeroMetric
              label="Web Platform"
              valueIcon={Laptop}
            />
          </div>
        </div>

        <div className="relative animate-slide-up self-start pt-28 lg:pl-8 xl:pl-16">
          <div className="absolute left-[4%] top-[8%] h-44 w-44 rounded-full bg-[#c59a44]/10 blur-3xl" />
          <div className="absolute right-[8%] top-[22%] h-48 w-48 rounded-full bg-[#6685c7]/10 blur-3xl" />

          <div className="relative mx-auto flex min-h-[560px] w-full max-w-[560px] ">
            <div className="absolute left-1/2 -top-24 z-10 -translate-x-1/2">
              <div className="landing-phone-stack origin-bottom transform-gpu">
                <PhoneMock imageSrc="/phone-sc-3.jpeg" />
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </section>
  );
}
