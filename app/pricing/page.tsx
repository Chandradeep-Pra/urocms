import Link from "next/link";
import { ArrowLeft, BadgeCheck, Brain, Crown, Sparkles, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

const plans = [
  {
    title: "Starter",
    price: "₹0",
    subtitle: "For students who want to explore the platform first.",
    features: [
      "Selected video access",
      "Sample chapter wise quizzes",
      "Limited mock exposure",
      "Basic progress view",
    ],
  },
  {
    title: "Premium",
    price: "₹4,999",
    subtitle: "For serious FRCS preparation with full study depth.",
    highlight: true,
    features: [
      "Complete video course access",
      "Full chapter wise quiz system",
      "Weekly mock tests",
      "Grand mock access",
      "Progress analytics",
      "AI viva system",
    ],
  },
  {
    title: "Ultimate",
    price: "₹7,999",
    subtitle: "For the most committed candidates who want every edge.",
    features: [
      "Everything in Premium",
      "Priority access to updates",
      "Early module unlocks",
      "Priority feature rollout access",
    ],
  },
];

export default function PricingPage() {
  return (
    <main className="uro-radial min-h-screen overflow-x-hidden px-6 py-10 text-white">
      <div className="pointer-events-none absolute inset-0 uro-grid opacity-20" />

      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-center justify-between gap-4">
          <div>
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-sm text-white/55 transition hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>
            <p className="text-sm uppercase tracking-[0.22em] text-emerald-200/60">Pricing</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
              Plans for students who take FRCS prep seriously.
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-white/62">
              Urologics is designed as a premium preparation platform. The value comes from combining
              structured learning, regular testing, analytics, and the AI viva system in one place.
            </p>
          </div>

          <Button asChild className="hidden rounded-full bg-emerald-300 text-black hover:bg-emerald-200 md:inline-flex">
            <Link href="/">Return Home</Link>
          </Button>
        </div>

        <div className="mb-12 grid gap-4 md:grid-cols-3">
          <TopStat icon={Video} title="Video + quiz" text="Structured learning, not fragmented revision." />
          <TopStat icon={BadgeCheck} title="Mocks + analytics" text="Progress becomes visible and actionable." />
          <TopStat icon={Brain} title="AI viva system" text="The strongest premium differentiator in the product." />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <Card
              key={plan.title}
              className={`rounded-[34px] border ${
                plan.highlight
                  ? "border-emerald-300/40 bg-[linear-gradient(180deg,rgba(88,255,191,0.14),rgba(255,255,255,0.04))] shadow-[0_24px_80px_rgba(27,60,48,0.42)]"
                  : "border-white/10 bg-white/[0.04]"
              }`}
            >
              <CardContent className="space-y-7 px-7 py-8">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-2xl font-semibold text-white">{plan.title}</p>
                    <p className="mt-3 text-sm leading-7 text-white/58">{plan.subtitle}</p>
                  </div>
                  {plan.highlight && (
                    <span className="rounded-full bg-emerald-300 px-3 py-1 text-xs font-medium text-black">
                      Best Value
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-5xl font-semibold tracking-[-0.04em] text-white">{plan.price}</p>
                  <p className="mt-2 text-sm text-white/45">Indicative launch pricing</p>
                </div>

                <div className="space-y-3">
                  {plan.features.map((feature) => (
                    <div key={feature} className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3">
                      <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-emerald-200" />
                      <p className="text-sm leading-6 text-white/72">{feature}</p>
                    </div>
                  ))}
                </div>

                <Button
                  className={`w-full rounded-full ${
                    plan.highlight
                      ? "bg-emerald-300 text-black hover:bg-emerald-200"
                      : "border border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                  }`}
                  variant={plan.highlight ? "default" : "outline"}
                >
                  Choose {plan.title}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-8">
            <p className="text-sm uppercase tracking-[0.2em] text-emerald-200/60">Why premium</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
              The value is not just content volume.
            </h2>
            <p className="mt-4 text-lg leading-8 text-white/62">
              Urologics is valuable because it combines content, testing, progress visibility,
              and realistic viva preparation into a system students can trust and return to consistently.
            </p>
          </div>

          <div className="rounded-[34px] border border-white/10 bg-[linear-gradient(135deg,rgba(18,34,29,0.98),rgba(8,16,14,0.98))] p-8">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-100">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-semibold text-white">Premium prep, clearer outcomes</p>
                <p className="text-sm text-white/55">Built for candidates who want to prepare with intent.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button className="rounded-full bg-emerald-300 text-black hover:bg-emerald-200">
                Get Early Access
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/12 bg-white/[0.04] text-white hover:bg-white/[0.08]">
                <Link href="/login">Admin Login</Link>
              </Button>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function TopStat({
  icon: Icon,
  title,
  text,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-emerald-300/10 text-emerald-100">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-5 text-xl font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-white/58">{text}</p>
    </div>
  );
}
