import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Brain,
  ChevronRight,
  CirclePlay,
  Crown,
  GraduationCap,
  Layers3,
  Play,
  ShieldCheck,
  Sparkles,
  Stethoscope,
  Trophy,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const topics = [
  "Stone disease",
  "Oncology",
  "Pediatrics",
  "Andrology",
  "Functional urology",
  "Trauma",
  "Haematuria",
  "LUTS",
  "Uro-radiology",
  "Emergencies",
];

const features = [
  {
    icon: Video,
    title: "Video courses",
    text: "Focused FRCS learning material built for exam-relevant understanding, not passive watching.",
  },
  {
    icon: Layers3,
    title: "Chapter wise quiz",
    text: "Target every topic in a structured way so revision becomes deliberate and measurable.",
  },
  {
    icon: Trophy,
    title: "Weekly mock tests",
    text: "Create a disciplined exam rhythm with regular testing and clearer feedback loops.",
  },
  {
    icon: Crown,
    title: "Grand mock",
    text: "Full-scale simulations to prepare for pressure, timing, and clinical recall.",
  },
  {
    icon: BarChart3,
    title: "Progress tracking",
    text: "See where you are improving, where you are plateauing, and what to revise next.",
  },
  {
    icon: Brain,
    title: "AI viva system",
    text: "A high-value viva experience designed to feel close to a real FRCS viva room.",
  },
];

const valuePoints = [
  {
    title: "One preparation system",
    text: "Video, quizzes, mocks, analytics, and viva practice live together in one serious workflow.",
  },
  {
    title: "Built for confidence",
    text: "Students are not left guessing if they are improving. The platform is meant to make progress visible.",
  },
  {
    title: "Premium where it matters",
    text: "The standout differentiator is the AI viva system, positioned as the most exam-real part of the product.",
  },
];

const marqueeItems = [...topics, ...topics];

export default function Page() {
  return (
    <main className="uro-radial min-h-screen overflow-x-hidden text-white">
      <div className="pointer-events-none absolute inset-0 uro-grid opacity-20" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(circle_at_top,rgba(120,255,210,0.14),transparent_42%)]" />

      <header className="sticky top-0 z-40 border-b border-white/8 bg-[#07110f]/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl border border-emerald-400/30 bg-emerald-400/10 text-sm font-bold text-emerald-200">
              U
            </div>
            <div>
              <p className="text-lg font-semibold tracking-tight text-white">Urologics</p>
              <p className="text-xs uppercase tracking-[0.2em] text-white/40">FRCS Urology Prep</p>
            </div>
          </div>

          <div className="hidden items-center gap-8 text-sm text-white/62 md:flex">
            <a href="#why" className="transition hover:text-white">Why Urologics</a>
            <a href="#ai-viva" className="transition hover:text-white">AI Viva</a>
            <a href="#mentor" className="transition hover:text-white">Direction</a>
            <Link href="/pricing" className="transition hover:text-white">Pricing</Link>
          </div>

          <div className="flex items-center gap-3">
            <Button
              asChild
              variant="outline"
              className="rounded-full border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            >
              <Link href="/pricing">View Pricing</Link>
            </Button>
            <Button className="rounded-full bg-emerald-300 text-black hover:bg-emerald-200">
              Get Early Access
            </Button>
          </div>
        </div>
      </header>

      <section className="relative px-6 pb-20 pt-16">
        <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.02fr_0.98fr]">
          <div className="animate-slide-up space-y-8">
            <div className="flex flex-wrap gap-3">
              <span className="uro-chip border-emerald-400/20 bg-emerald-400/10 text-emerald-100">
                Premium platform for FRCS medical candidates
              </span>
              <span className="uro-chip">Under the direction of Dr. Ankit Goel</span>
            </div>

            <div className="space-y-5">
              <h1 className="max-w-4xl text-5xl font-semibold leading-[0.94] tracking-[-0.05em] text-white sm:text-6xl lg:text-7xl">
                FRCS urology preparation
                <span className="block bg-[linear-gradient(135deg,#ffffff_10%,#81f7c6_42%,#8ecbff_88%)] bg-clip-text text-transparent">
                  that actually feels worth using.
                </span>
              </h1>

              <p className="max-w-2xl text-lg leading-8 text-white/66 sm:text-xl">
                Urologics helps students prepare better with video courses, chapter wise quizzes,
                weekly mocks, grand mocks, progress tracking, and an AI viva system that feels
                close to the real exam environment.
              </p>
            </div>

            <div className="flex flex-wrap gap-4">
              <Button className="rounded-full bg-emerald-300 px-6 py-6 text-base text-black hover:bg-emerald-200">
                Join Waitlist
              </Button>
              <Button
                variant="outline"
                className="rounded-full border-white/12 bg-white/[0.04] px-6 py-6 text-base text-white hover:bg-white/[0.08]"
              >
                <CirclePlay className="mr-2 h-4 w-4" />
                Watch Viva Demo
              </Button>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <HeroMetric label="Core layers" value="6" text="high-value prep surfaces in one place" />
              <HeroMetric label="Signature edge" value="AI Viva" text="designed to feel exam-real" />
              <HeroMetric label="Study rhythm" value="Weekly" text="regular mock cadence with analytics" />
            </div>
          </div>

          <div className="relative animate-slide-up">
            <div className="absolute -left-8 top-10 h-40 w-40 rounded-full bg-emerald-300/15 blur-3xl animate-float-slow" />
            <div className="absolute right-6 top-0 h-44 w-44 rounded-full bg-sky-300/10 blur-3xl animate-float-delay" />

            <div className="grid gap-6 xl:grid-cols-[1.08fr_0.82fr]">
              {/* <div className="uro-panel rounded-[34px] p-5">
                <div className="rounded-[28px] border border-white/10 bg-[#081310] p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.2em] text-white/40">AI Viva Showcase</p>
                      <h2 className="mt-2 text-2xl font-semibold text-white">Space for your hero demo video</h2>
                    </div>
                    <span className="rounded-full border border-emerald-300/20 bg-emerald-300/10 px-3 py-1 text-xs text-emerald-100">
                      Signature feature
                    </span>
                  </div>

                  <div className="relative mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#0e1b17,#08100d)]">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(94,234,212,0.14),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.16),transparent_28%)]" />
                    <div className="relative h-[420px] px-8 py-8">
                      <div className="absolute left-6 top-6 rounded-full bg-black/35 px-3 py-1.5 text-xs text-white/80 backdrop-blur">
                        AI viva demo slot
                      </div>
                      <div className="absolute right-6 top-6 flex items-center gap-2 text-xs text-white/45">
                        <span className="h-2 w-2 rounded-full bg-emerald-300 animate-pulse-soft" />
                        Product video
                      </div>

                      <div className="flex h-full items-center justify-center">
                        <button className="grid h-24 w-24 place-items-center rounded-full bg-white text-black shadow-[0_22px_60px_rgba(83,255,198,0.22)] transition hover:scale-105">
                          <Play className="ml-1 h-8 w-8 fill-current" />
                        </button>
                      </div>

                      <div className="absolute inset-x-8 bottom-8 grid gap-3 md:grid-cols-3">
                        <MiniPanel title="Adaptive follow-ups" text="Real examiner-style pressure" />
                        <MiniPanel title="Clinical flow" text="Answer structure matters" />
                        <MiniPanel title="Practice confidence" text="Repeat until sharp" />
                      </div>
                    </div>
                  </div>
                </div>
              </div> */}

              <div className="relative mx-auto w-full max-w-[330px]">
                <div className="relative mx-auto w-[300px] rounded-[48px] border border-white/12 bg-[#0a1310] p-[10px] shadow-[0_30px_90px_rgba(0,0,0,0.42)]">
                  <div className="absolute left-1/2 top-[10px] h-[28px] w-[112px] -translate-x-1/2 rounded-full bg-black/80" />
                  <div className="absolute left-[10px] right-[10px] top-[10px] h-[calc(100%-20px)] rounded-[40px] border border-white/8" />

                  <div className="relative overflow-hidden rounded-[38px] border border-white/10 bg-[linear-gradient(180deg,#0d1916,#070d0c)] px-5 pb-6 pt-10">
                    <div className="absolute inset-0">
                      <Image
                        src="/background.jpg"
                        alt="App background"
                        fill
                        className="object-cover opacity-10"
                      />
                    </div>

                    <div className="relative">
                      <div className="flex items-center justify-between text-[11px] text-white/55">
                        <span>09:41</span>
                        <span>Urologics</span>
                      </div>

                      <div className="mt-6 rounded-[26px] border border-white/10 bg-white/[0.04] p-4">
                        <p className="text-xs uppercase tracking-[0.16em] text-white/40">
                          Student dashboard
                        </p>
                        <p className="mt-2 text-lg font-semibold text-white">
                          Focused prep. Clear progress.
                        </p>

                        <div className="mt-5 space-y-4">
                          <PhoneLine label="Video progress" width="72%" />
                          <PhoneLine label="Quiz confidence" width="84%" />
                          <PhoneLine label="Weekly mock score" width="67%" />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-3">
                        <div className="rounded-[24px] border border-white/10 bg-white/[0.04] p-4">
                          <p className="text-sm font-medium text-white">Next step</p>
                          <p className="mt-2 text-sm leading-6 text-white/60">
                            Revise oncology cases, then attempt the AI viva station.
                          </p>
                        </div>
                        <div className="rounded-[24px] border border-emerald-300/15 bg-emerald-300/10 p-4 text-sm text-emerald-50">
                          Built to feel valuable the moment a student lands here.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-white/6 bg-black/10 py-4">
        <div className="overflow-hidden whitespace-nowrap">
          <div className="animate-marquee inline-flex min-w-max gap-3 px-4">
            {marqueeItems.map((item, index) => (
              <span key={`${item}-${index}`} className="uro-chip">
                {item}
              </span>
            ))}
          </div>
        </div>
      </section>

      <section id="why" className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="space-y-5">
              <p className="text-sm uppercase tracking-[0.22em] text-emerald-200/60">Why it matters</p>
              <h2 className="text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                Students should immediately feel this helps them prepare better.
              </h2>
              <p className="text-lg leading-8 text-white/62">
                The product should communicate value fast: clearer structure, more realistic practice,
                better visibility into progress, and a standout viva system that makes the platform feel worth committing to.
              </p>
            </div>

            <div className="grid gap-4">
              {valuePoints.map((item) => (
                <div key={item.title} className="uro-panel rounded-[28px] p-6">
                  <div className="flex items-start gap-4">
                    <div className="grid h-11 w-11 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-200">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-white">{item.title}</h3>
                      <p className="mt-2 text-sm leading-7 text-white/58">{item.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 py-24">
        <div className="mx-auto max-w-7xl">
          <div className="mb-12 max-w-3xl">
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-200/60">Platform stack</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
              The full exam-prep workflow, not just one feature.
            </h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {features.map((item, index) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.title}
                  className={`uro-panel rounded-[30px] p-6 transition duration-300 hover:-translate-y-1 hover:border-white/18 ${
                    index === 5 ? "bg-[linear-gradient(180deg,rgba(88,255,191,0.12),rgba(255,255,255,0.04))]" : ""
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white/[0.05] text-emerald-200">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ChevronRight className="h-4 w-4 text-white/30" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold tracking-[-0.03em] text-white">
                    {item.title}
                  </h3>
                  <p className="mt-3 text-sm leading-7 text-white/60">{item.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section id="ai-viva" className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="uro-panel rounded-[34px] p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-200/60">Signature differentiator</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
              The AI viva system makes the product feel unmistakably more valuable.
            </h2>
            <p className="mt-4 text-lg leading-8 text-white/62">
              This is the feature that should make students stop and pay attention. It is not just another quiz
              format. It is meant to feel closer to how they will actually be challenged in viva.
            </p>

            <div className="mt-8 space-y-4">
              <ValueRow
                icon={Brain}
                title="Adaptive questioning"
                text="The system can feel more alive and more exam-like than static mock content."
              />
              <ValueRow
                icon={Stethoscope}
                title="Clinical reasoning under pressure"
                text="Students practice structured thinking, not just memorized fragments."
              />
              <ValueRow
                icon={ShieldCheck}
                title="Better readiness before the real exam"
                text="Repeated viva-style exposure can reduce uncertainty and improve answer discipline."
              />
            </div>
          </div>

          <div className="uro-panel rounded-[34px] p-5">
            <div className="rounded-[28px] border border-white/10 bg-[#081310] p-5">
              <p className="text-xs uppercase tracking-[0.18em] text-white/40">AI Viva frame</p>
              <h3 className="mt-2 text-2xl font-semibold text-white">Reserved for your real recording</h3>
              <div className="relative mt-5 overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(135deg,#0d1915,#08100d)]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(94,234,212,0.14),transparent_38%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.15),transparent_28%)]" />
                <div className="relative flex min-h-[420px] items-center justify-center px-8 py-12">
                  <div className="text-center">
                    <button className="mx-auto grid h-24 w-24 place-items-center rounded-full bg-white text-black shadow-[0_22px_60px_rgba(83,255,198,0.22)] transition hover:scale-105">
                      <Play className="ml-1 h-8 w-8 fill-current" />
                    </button>
                    <p className="mt-6 text-lg font-medium text-white">AI viva demo placeholder</p>
                    <p className="mt-2 max-w-md text-sm leading-7 text-white/55">
                      Keep this section ready for the actual product recording so the landing page feels premium and believable.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="mentor" className="px-6 py-24">
        <div className="mx-auto grid max-w-7xl items-center gap-8 lg:grid-cols-[0.8fr_1.2fr]">
          <div className="uro-panel rounded-[34px] p-5">
            <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,#13201b,#0a110f)] p-6">
              <div className="relative flex min-h-[360px] items-center justify-center rounded-[24px] border border-dashed border-white/10 bg-white/[0.03] text-center">
                <div className="max-w-xs space-y-3">
                  <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-300/10 text-emerald-100">
                    <GraduationCap className="h-9 w-9" />
                  </div>
                  <p className="text-lg font-semibold text-white">Dr. Ankit Goel</p>
                  <p className="text-sm leading-7 text-white/55">
                    Founder/mentor image area for final branded assets.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="uro-panel rounded-[34px] p-8">
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-200/60">Academic direction</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
              Made under the direction of Dr. Ankit Goel.
            </h2>
            <p className="mt-4 text-lg leading-8 text-white/62">
              Urologics is positioned as a serious preparation platform for FRCS candidates. The experience should feel
              intentional, premium, and clinically grounded rather than generic edtech.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <DirectionCard
                title="Serious tone"
                text="The visual language should reassure candidates that the platform respects the exam."
              />
              <DirectionCard
                title="High perceived value"
                text="Students should quickly understand why this is more useful than disconnected prep resources."
              />
              <DirectionCard
                title="Premium design"
                text="The product should look polished enough to support trust before the student even signs up."
              />
              <DirectionCard
                title="Focused outcomes"
                text="Everything should point back to preparing better, performing better, and feeling more ready."
              />
            </div>
          </div>
        </div>
      </section>

      <section className="px-6 pb-24 pt-10">
        <div className="mx-auto max-w-7xl">
          <div className="relative overflow-hidden rounded-[40px] border border-white/10 bg-[linear-gradient(135deg,rgba(18,34,29,0.98),rgba(8,16,14,0.98))] px-8 py-10 sm:px-12 sm:py-14">
            <div className="absolute -right-14 top-0 h-56 w-56 rounded-full bg-emerald-300/10 blur-3xl" />
            <div className="relative flex flex-col gap-8 lg:flex-row lg:items-end lg:justify-between">
              <div className="max-w-3xl">
                <p className="text-sm uppercase tracking-[0.22em] text-emerald-200/60">Pricing</p>
                <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white sm:text-5xl">
                  Explore plans built for serious candidates.
                </h2>
                <p className="mt-4 text-lg leading-8 text-white/62">
                  I added a dedicated pricing page so the homepage can stay focused on value and product story.
                </p>
              </div>

              <Button asChild className="rounded-full bg-emerald-300 px-6 py-6 text-base text-black hover:bg-emerald-200">
                <Link href="/pricing">
                  View Pricing
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/8 px-6 py-10">
        <div className="mx-auto flex max-w-7xl flex-col gap-5 text-sm text-white/40 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-2xl border border-emerald-400/25 bg-emerald-400/10 text-sm font-bold text-emerald-200">
              U
            </div>
            <div>
              <p className="font-medium text-white/80">Urologics</p>
              <p>Premium prep platform for FRCS medical candidates.</p>
            </div>
          </div>

          <div className="flex flex-col items-start gap-2 text-left md:items-end">
            <p>© {new Date().getFullYear()} Urologics · Under the direction of Dr. Ankit Goel</p>
            <Link
              href="/login"
              className="text-xs uppercase tracking-[0.18em] text-emerald-200/80 underline underline-offset-4 hover:text-white"
            >
              Admin Login
            </Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

function HeroMetric({
  label,
  value,
  text,
}: {
  label: string;
  value: string;
  text: string;
}) {
  return (
    <div className="uro-panel rounded-[28px] px-5 py-5">
      <p className="text-[11px] uppercase tracking-[0.18em] text-white/38">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-[-0.04em] text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/55">{text}</p>
    </div>
  );
}

function MiniPanel({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-white/[0.04] p-3">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-xs leading-6 text-white/50">{text}</p>
    </div>
  );
}

function PhoneLine({ label, width }: { label: string; width: string }) {
  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-xs text-white/58">
        <span>{label}</span>
        <span>{width}</span>
      </div>
      <div className="h-2 rounded-full bg-white/8">
        <div
          className="h-2 rounded-full bg-[linear-gradient(90deg,#7bf4bf,#8ecbff)]"
          style={{ width }}
        />
      </div>
    </div>
  );
}

function ValueRow({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex gap-4 rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
      <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-200">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-base font-medium text-white">{title}</p>
        <p className="mt-1 text-sm leading-7 text-white/58">{text}</p>
      </div>
    </div>
  );
}

function DirectionCard({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <p className="text-lg font-medium text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-white/58">{text}</p>
    </div>
  );
}
