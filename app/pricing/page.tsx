import Link from "next/link";
import {
  ArrowLeft,
  BadgeCheck,
  BookOpen,
  Brain,
  Clock3,
  FileQuestion,
  CheckCircle2,
  Gift,
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
  category?: string;
  tag?: string;
  price: number;
  subtitle: string;
  featureBullets: string[];
  billingLabel?: string;
  availabilityNote?: string;
  vivaMinutes?: number;
  items: Array<{
    key: "chapters" | "videos" | "quizzes" | "mocks" | "vivaCases";
    label: string;
    count: number;
    details: string[];
  }>;
  expiryMonths: number;
  durationLabel?: string;
  highlight?: boolean;
  sortOrder?: number;
};

type PricingCoupon = {
  id: string;
  code: string;
  description?: string;
  discountType: "percent" | "amount";
  discountValue: number;
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
          category: String(data.category ?? "").trim(),
          tag: String(data.tag ?? "").trim(),
          price: Number(data.price ?? 0),
          subtitle: String(data.description ?? "").trim(),
          featureBullets: Array.isArray(data.featureBullets) ? data.featureBullets : [],
          billingLabel: String(data.billingLabel ?? "").trim(),
          availabilityNote: String(data.availabilityNote ?? "").trim(),
          vivaMinutes: Number(data.vivaMinutes ?? 0),
          items,
          expiryMonths: Number(data.expiryMonths ?? 1),
          durationLabel: String(data.durationLabel ?? "").trim(),
          sortOrder: Number(data.sortOrder ?? 0),
        };
      })
      .sort((a, b) => {
        const orderDelta = (a.sortOrder ?? 0) - (b.sortOrder ?? 0);
        if (orderDelta !== 0) return orderDelta;
        return a.price - b.price;
      })
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

async function getActiveCoupons(): Promise<PricingCoupon[]> {
  try {
    const snapshot = await adminDb.collection("pricingCoupons").where("isActive", "==", true).get();
    return snapshot.docs.map((doc) => ({
      id: doc.id,
      ...(doc.data() as Omit<PricingCoupon, "id">),
    }));
  } catch (error) {
    console.error("Pricing page coupons fetch error:", error);
    return [];
  }
}

export default async function PricingPage() {
  const [plans, coupons] = await Promise.all([getPricingPlans(), getActiveCoupons()]);

  return (
    <main className="min-h-screen overflow-x-hidden bg-cyan-50 px-6 py-10 text-[#071014]">
  <div className="mx-auto max-w-7xl">
    <div className="mb-14 flex items-start justify-between gap-6">
      <div className="max-w-4xl">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-[#0f7896] transition hover:text-[#0b5f77]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to home
        </Link>

        <p className="text-sm font-semibold uppercase tracking-[0.22em] text-[#0f7896]">
          Pricing
        </p>

        <h1 className="mt-4 text-5xl font-semibold tracking-[-0.05em] text-[#071014] sm:text-6xl">
          Simple plans for serious FRCS preparation.
        </h1>

        <p className="mt-5 max-w-3xl text-lg leading-8 text-[#071014]/65">
          Choose structured access to Urologics courses, tests, analytics, and AI viva preparation.
        </p>
      </div>

      <Button
        asChild
        className="hidden rounded-full bg-[#0f7896] px-5 text-white hover:bg-[#0b647d] md:inline-flex"
      >
        <Link href="/">Return Home</Link>
      </Button>
    </div>

    {coupons.length ? (
      <div className="mb-8 grid gap-4">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className="rounded-[28px] border border-[#0f7896]/12 bg-white p-5 shadow-[0_14px_36px_rgba(15,120,150,0.08)]"
          >
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f7896]/10 text-[#0f7896]">
                  <Gift className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
                    Coupon Live
                  </p>
                  <p className="mt-1 text-lg font-semibold text-[#071014]">{coupon.code}</p>
                  <p className="mt-1 text-sm text-[#071014]/62">
                    {coupon.description ||
                      (coupon.discountType === "percent"
                        ? `${coupon.discountValue}% off selected enrolments.`
                        : `£${coupon.discountValue} off selected enrolments.`)}
                  </p>
                </div>
              </div>
              <div className="rounded-full bg-[#0f7896] px-4 py-2 text-sm font-semibold text-white">
                {coupon.discountType === "percent"
                  ? `${coupon.discountValue}% OFF`
                  : `£${coupon.discountValue} OFF`}
              </div>
            </div>
          </div>
        ))}
      </div>
    ) : null}

    <div className="mb-12 grid gap-4 md:grid-cols-3">
      <TopStat icon={Video} title="Video + quiz" text="Structured learning, not scattered revision." />
      <TopStat icon={BadgeCheck} title="Mocks + analytics" text="Track what is improving clearly." />
      <TopStat icon={Brain} title="AI viva system" text="Practice closer to the real exam room." />
    </div>

    <div className="grid gap-6 lg:grid-cols-3">
      {plans.length === 0 ? (
        <div className="rounded-[32px] border border-[#0f7896]/12 bg-white p-10 shadow-[0_18px_50px_rgba(15,120,150,0.08)] lg:col-span-3">
          <p className="text-lg font-semibold text-[#071014]">No pricing plans published yet.</p>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[#071014]/65">
            Plans created and marked active in Plan Creator will appear here automatically.
          </p>
        </div>
      ) : (
        plans.map((plan) => (
          <details
            key={plan.id}
            className={`group/plan overflow-hidden rounded-[32px] transition-all duration-300 ${
              plan.highlight
                ? "bg-[#0f7896] text-white shadow-[0_24px_65px_rgba(15,120,150,0.24)]"
                : "border border-[#0f7896]/12 bg-white text-[#071014] shadow-[0_16px_40px_rgba(15,120,150,0.09)]"
            }`}
          >
            <summary className="cursor-pointer list-none px-7 py-8 [&::-webkit-details-marker]:hidden">
              <div className="flex items-start justify-between gap-5">
                <div>
                  {plan.category ? (
                    <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${plan.highlight ? "text-white/60" : "text-[#0f7896]"}`}>
                      {plan.category}
                    </p>
                  ) : null}
                  <p className="mt-1 text-3xl font-semibold tracking-[-0.04em]">
                    {plan.name}
                  </p>
                </div>

                {plan.tag ? (
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      plan.highlight
                        ? "bg-white text-[#0f7896]"
                        : "bg-[#0f7896]/10 text-[#0f7896]"
                    }`}
                  >
                    {plan.tag}
                  </span>
                ) : null}
              </div>

              <p className={`mt-4 text-sm leading-7 ${plan.highlight ? "text-white/78" : "text-[#071014]/62"}`}>
                {plan.subtitle || "Custom access plan built from selected Urologics content."}
              </p>

              <div
                className={`mt-6 rounded-[24px] p-6 ${
                  plan.highlight
                    ? "border border-white/20 bg-white/10"
                    : "border border-[#0f7896]/10 bg-cyan-50"
                }`}
              >
                <p className="text-5xl font-semibold tracking-[-0.05em]">
                  {formatGbp(plan.price)}
                </p>

                <div className={`mt-4 flex items-center gap-2 text-sm font-semibold ${plan.highlight ? "text-white/85" : "text-[#0f7896]"}`}>
                  <Clock3 className="h-4 w-4" />
                  <span>
                    {plan.durationLabel
                      ? plan.durationLabel
                      : `Valid for ${pluralize(plan.expiryMonths, "month")}`}
                  </span>
                </div>
                {plan.billingLabel ? (
                  <p className={`mt-3 text-sm ${plan.highlight ? "text-white/70" : "text-[#071014]/55"}`}>
                    {plan.billingLabel}
                  </p>
                ) : null}
                {plan.availabilityNote ? (
                  <p className={`mt-2 text-xs font-semibold uppercase tracking-[0.16em] ${plan.highlight ? "text-white/62" : "text-amber-700"}`}>
                    {plan.availabilityNote}
                  </p>
                ) : null}
                {plan.vivaMinutes ? (
                  <p className={`mt-2 text-xs ${plan.highlight ? "text-white/70" : "text-[#071014]/55"}`}>
                    Includes {plan.vivaMinutes} AI viva minutes
                  </p>
                ) : null}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <span className={`text-sm ${plan.highlight ? "text-white/70" : "text-[#071014]/55"}`}>
                  Expand to see included access
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-sm font-semibold ${
                    plan.highlight
                      ? "bg-white/15 text-white"
                      : "bg-[#0f7896]/10 text-[#0f7896]"
                  }`}
                >
                  Details
                </span>
              </div>

              <Button
                className={`mt-6 w-full rounded-full ${
                  plan.highlight
                    ? "bg-white text-[#0f7896] hover:bg-white/90"
                    : "bg-[#0f7896] text-white hover:bg-[#0b647d]"
                }`}
              >
                Choose {plan.name}
              </Button>
            </summary>

            <div className="space-y-4 px-7 pb-8">
              <div className={plan.highlight ? "h-px bg-white/18" : "h-px bg-[#0f7896]/12"} />

              <p className={`text-xs font-semibold uppercase tracking-[0.18em] ${plan.highlight ? "text-white/70" : "text-[#0f7896]"}`}>
                Included access
              </p>

              <div className="space-y-3">
                {plan.featureBullets.length ? (
                  plan.featureBullets.map((feature) => (
                    <div
                      key={`${plan.id}-${feature}`}
                      className={`rounded-2xl p-4 ${
                        plan.highlight
                          ? "border border-white/18 bg-white/10"
                          : "border border-[#0f7896]/10 bg-cyan-50"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <CheckCircle2
                          className={`mt-0.5 h-5 w-5 shrink-0 ${
                            plan.highlight ? "text-white" : "text-[#0f7896]"
                          }`}
                        />
                        <p className="text-base font-semibold">{feature}</p>
                      </div>
                    </div>
                  ))
                ) : plan.items.length === 0 ? (
                  <div className={`rounded-2xl p-4 ${plan.highlight ? "bg-white/10" : "bg-cyan-50"}`}>
                    <p className="text-sm font-semibold">Custom access bundle</p>
                  </div>
                ) : (
                  plan.items.map((item) => {
                    const compactLabel = `${item.count} ${item.label}`;

                    return (
                      <div
                        key={`${plan.id}-${item.key}`}
                        className={`rounded-2xl p-4 ${
                          plan.highlight
                            ? "border border-white/18 bg-white/10"
                            : "border border-[#0f7896]/10 bg-cyan-50"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <CheckCircle2
                            className={`mt-0.5 h-5 w-5 shrink-0 ${
                              plan.highlight ? "text-white" : "text-[#0f7896]"
                            }`}
                          />
                          <div>
                            <p className="text-base font-semibold">{compactLabel}</p>
                            <p className={`mt-1 text-xs leading-6 ${plan.highlight ? "text-white/70" : "text-[#071014]/55"}`}>
                              {item.details.slice(0, 3).join(", ")}
                              {item.details.length > 3 ? ` +${item.details.length - 3} more` : ""}
                            </p>
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
  </div>
</main>
  );
}

function TopStat({ icon: Icon, title, text }) {
  return (
    <div className="rounded-[24px] border border-[#0f7896]/12 bg-white p-5 shadow-[0_14px_36px_rgba(15,120,150,0.08)]">
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-[#0f7896]/10 text-[#0f7896]">
        <Icon className="h-5 w-5" />
      </div>
      <p className="text-lg font-semibold tracking-[-0.03em] text-[#071014]">{title}</p>
      <p className="mt-2 text-sm leading-6 text-[#071014]/62">{text}</p>
    </div>
  );
}
