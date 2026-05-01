import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Brain,
  ChevronRight,
  CirclePlay,
  Clock3,
  Crown,
  FileQuestion,
  CheckCircle2,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { adminDb } from "@/lib/firebaseAdmin";

export const dynamic = "force-dynamic";

const pageBackground =
  "bg-[radial-gradient(circle_at_top,rgba(210,184,92,0.12),transparent_14%),radial-gradient(circle_at_82%_18%,rgba(25,54,102,0.22),transparent_18%),radial-gradient(circle_at_50%_100%,rgba(10,24,47,0.28),transparent_30%),linear-gradient(180deg,#030813_0%,#08152a_24%,#0c2c53_58%,#050c18_100%)]";
const panelClass =
  "border border-[#d8bd67]/18 bg-[linear-gradient(180deg,rgba(8,20,40,0.98),rgba(4,11,23,0.99))] shadow-[0_34px_110px_rgba(0,4,14,0.7)]";
const subtlePanelClass =
  "border border-white/12 bg-[linear-gradient(180deg,rgba(12,29,56,0.96),rgba(6,17,34,0.99))] shadow-[0_28px_90px_rgba(0,4,14,0.56)]";

type PricingPlanCard = {
  id: string;
  name: string;
  tag?: string;
  price: number;
  subtitle: string;
  items: Array<{
    key: "chapters" | "videos" | "quizzes" | "mocks" | "vivaCases";
    label: string;
    count: number;
    details: string[];
  }>;
  expiryMonths: number;
  highlight?: boolean;
};

const featureMeta = {
  chapters: { label: "Chapter", plural: "Chapters", icon: BookOpen },
  videos: { label: "Video", plural: "Videos", icon: Video },
  quizzes: { label: "Quiz", plural: "Quizzes", icon: FileQuestion },
  mocks: { label: "Mock", plural: "Mocks", icon: BadgeCheck },
  vivaCases: { label: "AI Viva Set", plural: "AI Viva Sets", icon: Brain },
} as const;

const selectionKeyMap: Record<keyof typeof featureMeta, string> = {
  chapters: "chapterIds",
  videos: "videoIds",
  quizzes: "quizIds",
  mocks: "mockIds",
  vivaCases: "vivaCaseIds",
};

function formatGbp(price: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(price);
}

function pluralize(value: number, singular: string, plural = `${singular}s`) {
  return `${value} ${value === 1 ? singular : plural}`;
}

async function getPricingPlans(): Promise<PricingPlanCard[]> {
  try {
    const [snapshot, chaptersSnap, videosSnap, quizzesSnap, mocksSnap, vivaSnap] = await Promise.all([
      adminDb.collection("pricingPlans").where("isActive", "==", true).get(),
      adminDb.collection("chapters").where("isActive", "==", true).get(),
      adminDb.collection("videoItems").get(),
      adminDb.collection("quizzes").where("isActive", "==", true).get(),
      adminDb.collection("mocks").get(),
      adminDb.collection("vivaCases").where("isActive", "==", true).get(),
    ]);

    const titleMap = {
      chapters: Object.fromEntries(
        chaptersSnap.docs.map((doc) => [doc.id, String(doc.data().title ?? doc.id)])
      ),
      videos: Object.fromEntries(
        videosSnap.docs.map((doc) => [doc.id, String(doc.data().title ?? "Untitled Video")])
      ),
      quizzes: Object.fromEntries(
        quizzesSnap.docs.map((doc) => [doc.id, String(doc.data().title ?? doc.id)])
      ),
      mocks: Object.fromEntries(
        mocksSnap.docs.map((doc) => [doc.id, String(doc.data().title ?? "Untitled Mock")])
      ),
      vivaCases: Object.fromEntries(
        vivaSnap.docs.map((doc) => [
          doc.id,
          String(doc.data().case?.title ?? doc.data().title ?? "Untitled Viva Case"),
        ])
      ),
    };

    const plans = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        const selectedContent = data.selectedContent ?? {};
        const items = (Object.keys(featureMeta) as Array<keyof typeof featureMeta>)
          .map((key) => {
            const selectionKey = selectionKeyMap[key];
            const ids = Array.isArray(selectedContent?.[selectionKey])
              ? selectedContent[selectionKey]
              : Array.isArray(selectedContent?.[key])
                ? selectedContent[key]
                : [];
            const details = ids
              .map((id: string) => titleMap[key][id])
              .filter(Boolean);

            if (details.length === 0) {
              return null;
            }

            return {
              key,
              label:
                details.length === 1 ? featureMeta[key].label : featureMeta[key].plural,
              count: details.length,
              details,
            };
          })
          .filter(Boolean) as PricingPlanCard["items"];

        return {
          id: doc.id,
          name: String(data.name ?? "Untitled Plan"),
          tag: String(data.tag ?? "").trim(),
          price: Number(data.price ?? 0),
          subtitle: String(data.description ?? "").trim(),
          items,
          expiryMonths: Number(data.expiryMonths ?? 1),
        };
      })
      .sort((a, b) => a.price - b.price)
      .map((plan, index, array) => ({
        ...plan,
        highlight:
          array.length === 1
            ? true
            : array.length >= 3
              ? index === 1
              : index === array.length - 1,
      }));

    if (plans.length > 0) {
      return plans;
    }
  } catch (error) {
    console.error("Pricing page plans fetch error:", error);
  }

  return [];
}

export default async function PricingPage() {
  const plans = await getPricingPlans();

  return (
    <main className={`${pageBackground} min-h-screen overflow-x-hidden px-6 py-10 text-white`}>
      <div className="pointer-events-none absolute inset-0 uro-grid opacity-20" />

      <div className="mx-auto max-w-7xl">
        <div className="mb-12 flex items-start justify-between gap-6">
          <div className="max-w-4xl">
            <Link
              href="/"
              className="mb-4 inline-flex items-center gap-2 text-sm text-white/60 transition hover:text-[#f1d77c]"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to home
            </Link>

            <p className="text-sm uppercase tracking-[0.22em] text-[#e1c777]/70">Pricing</p>
            <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-white sm:text-6xl">
              Simple plans for serious FRCS preparation.
            </h1>
            <p className="mt-4 max-w-3xl text-lg leading-8 text-white/72">
              Urologics is designed as a focused premium preparation platform. The value comes
              from structured learning, regular testing, clear progress visibility, and an AI viva
              system that feels closer to the real exam.
            </p>
          </div>

          <Button
            asChild
            className="hidden rounded-full bg-[#d8bd67] text-[#09172d] hover:bg-[#e7cb74] md:inline-flex"
          >
            <Link href="/">Return Home</Link>
          </Button>
        </div>

        <div className="mb-12 grid gap-4 md:grid-cols-3">
          <TopStat icon={Video} title="Video + quiz" text="Structured learning, not fragmented revision." />
          <TopStat icon={BadgeCheck} title="Mocks + analytics" text="Progress becomes visible and actionable." />
          <TopStat icon={Brain} title="AI viva system" text="The strongest premium differentiator in the product." />
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {plans.length === 0 ? (
            <div className={`rounded-[34px] p-10 lg:col-span-3 ${panelClass}`}>
              <p className="text-lg font-semibold text-white">No pricing plans published yet.</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-white/78">
                Plans created and marked active in `Plan Creator` will appear here automatically.
              </p>
            </div>
          ) : (
            plans.map((plan) => (
              <details
                key={plan.id}
                className={`group/plan rounded-[34px] ${plan.highlight ? panelClass : subtlePanelClass}`}
              >
                <summary className="cursor-pointer list-none px-8 py-9 [&::-webkit-details-marker]:hidden">
                  <div className="flex items-start justify-between gap-5">
                    <div className="space-y-3">
                      <p className="text-[2rem] font-semibold leading-none text-white">{plan.name}</p>
                    </div>
                    {plan.tag ? (
                      <span className="rounded-full bg-[#d8bd67] px-3 py-1 text-xs font-medium text-[#09172d]">
                        {plan.tag}
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-5 rounded-[24px] border border-[#d8bd67]/14 bg-[rgba(216,189,103,0.08)] px-5 py-4">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#f1d77c]">
                      Description
                    </p>
                    <p className="mt-3 text-sm leading-7 text-[#f5f8ff]">
                      {plan.subtitle || "Custom access plan built from selected Urologics content."}
                    </p>
                  </div>

                  <div className="mt-5 rounded-[28px] border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.05),rgba(255,255,255,0.03))] p-7">
                    <p className="text-5xl font-semibold tracking-[-0.05em] text-white">
                      {formatGbp(plan.price)}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-[#f1d77c]">
                      <Clock3 className="h-4 w-4" />
                      <span>Valid for {pluralize(plan.expiryMonths, "month")}</span>
                    </div>
                  </div>

                  <div className="mt-5 flex items-center justify-between rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-4 text-sm text-white/88 transition group-open/plan:border-[#d8bd67]/20 group-open/plan:bg-white/[0.06]">
                    <span>Expand to see full plan details</span>
                    <span className="font-medium text-[#f1d77c] group-open/plan:hidden">Show details</span>
                    <span className="hidden font-medium text-[#f1d77c] group-open/plan:inline">Hide details</span>
                  </div>

                  <div className="mt-6 flex items-center gap-3">
                    <Button
                      className={`flex-1 rounded-full ${
                        plan.highlight
                          ? "bg-[#d8bd67] text-[#09172d] hover:bg-[#e7cb74]"
                          : "border border-white/16 bg-white/[0.05] text-white hover:bg-white/[0.1]"
                      }`}
                      variant={plan.highlight ? "default" : "outline"}
                    >
                      Choose {plan.name}
                    </Button>
                  </div>
                </summary>

                <div className="space-y-4 px-8 pb-9">
                  <div className="h-px bg-white/10" />
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f1d77c]">
                      Included access
                    </p>
                  </div>

                  <div className="space-y-4">
                    {plan.items.length === 0 ? (
                      <div className="rounded-2xl border border-white/12 bg-[rgba(255,255,255,0.08)] px-4 py-5">
                        <p className="text-sm font-semibold text-white">Custom access bundle</p>
                      </div>
                    ) : (
                      plan.items.map((item) => {
                        const compactLabel = `${item.count} ${item.label}`;

                        return (
                          <div key={`${plan.id}-${item.key}`} className="group/item relative">
                            <div className="rounded-[24px] border border-white/12 bg-[rgba(255,255,255,0.08)] px-4 py-5 transition hover:border-[#d8bd67]/35 hover:bg-[rgba(255,255,255,0.11)]">
                              <div className="flex items-start gap-3">
                                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#f1d77c]" />
                                <div className="min-w-0 flex-1">
                                  <p className="text-base font-semibold text-white">{compactLabel}</p>
                                  <p className="mt-2 text-xs leading-6 text-[#dce8ff]/90">
                                    Hover to view the exact included {item.count === 1 ? "item" : "items"}
                                  </p>
                                </div>
                                <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-[#f1d77c] transition group-hover/item:translate-x-0.5" />
                              </div>
                            </div>

                            <div className="pointer-events-none absolute left-[calc(100%+18px)] top-0 z-30 hidden w-[320px] rounded-[24px] border border-[#d8bd67]/18 bg-[linear-gradient(180deg,#0b274a,#06182f)] p-5 shadow-[0_26px_70px_rgba(0,4,14,0.72)] group-hover/item:block">
                              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#f1d77c]">
                                Included {item.label}
                              </p>
                              <div className="space-y-2">
                                {item.details.slice(0, 6).map((detail) => (
                                  <div
                                    key={detail}
                                    className="flex items-start gap-2 rounded-xl border border-white/10 bg-white/[0.05] px-3 py-2.5 text-sm text-white/92"
                                  >
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#f1d77c]" />
                                    <span>{detail}</span>
                                  </div>
                                ))}
                                {item.details.length > 6 ? (
                                  <div className="px-1 pt-1 text-xs text-white/62">
                                    +{item.details.length - 6} more
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              </details>
            ))
          )}
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className={`rounded-[34px] p-8 ${panelClass}`}>
            <p className="text-sm uppercase tracking-[0.2em] text-[#e1c777]/70">Why premium</p>
            <h2 className="mt-4 text-4xl font-semibold tracking-[-0.04em] text-white">
              The value is not just content volume.
            </h2>
            <p className="mt-4 text-lg leading-8 text-white/72">
              Urologics becomes valuable because it combines content, testing, progress visibility,
              and realistic viva preparation into one study system that students can trust and return
              to consistently.
            </p>
          </div>

          <div className="rounded-[34px] border border-[#c8ab52]/12 bg-[linear-gradient(135deg,rgba(10,32,62,0.98),rgba(4,16,31,0.98))] p-8 shadow-[0_30px_100px_rgba(0,4,14,0.62)]">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d8bd67]/10 text-[#f1d77c]">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xl font-semibold text-white">Premium prep, clearer outcomes</p>
                <p className="text-sm text-white/62">Built for candidates who want to prepare with intent.</p>
              </div>
            </div>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button className="rounded-full bg-[#d8bd67] text-[#09172d] hover:bg-[#e7cb74]">
                Get Early Access
              </Button>
              <Button
                asChild
                variant="outline"
                className="rounded-full border-[#c8ab52]/14 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              >
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
    <div className={`rounded-[28px] p-6 ${panelClass}`}>
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-[#d8bd67]/10 text-[#f1d77c]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-5 text-xl font-semibold text-white">{title}</p>
      <p className="mt-2 text-sm leading-7 text-white/68">{text}</p>
    </div>
  );
}
