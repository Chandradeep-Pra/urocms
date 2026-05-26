"use client";

import { useState } from "react";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Layers3,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type PricingPlanVersion = {
  id: string;
  months: number;
  price: number;
  originalPrice?: number;
  discountedPrice?: number;
  embeddedLink?: string;
  couponCode?: string;
  billingLabel?: string;
  durationLabel?: string;
};

type PricingPlanCard = {
  id: string;
  name: string;
  category?: string;
  tag?: string;
  versions: PricingPlanVersion[];
  price: number;
  originalPrice?: number;
  discountedPrice?: number;
  embeddedLink?: string;
  couponCode?: string;
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
  courseItems: Array<{
    id: string;
    title: string;
    accessTier: "free" | "paid";
    showOnApp: boolean;
    sectionsCount: number;
  }>;
  expiryMonths: number;
  durationLabel?: string;
  sortOrder?: number;
};

type GroupedPlans = {
  category: string;
  plans: PricingPlanCard[];
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

function AccessLine({ text, meta }: { text: string; meta?: string }) {
  return (
    <div className="rounded-2xl border border-[#0f7896]/10 bg-white px-4 py-3 shadow-[0_8px_20px_rgba(15,120,150,0.04)]">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-[#0f7896]" />
        <div>
          <p className="text-sm font-semibold text-[#071014]">{text}</p>
          {meta ? <p className="mt-1 text-xs leading-6 text-[#071014]/55">{meta}</p> : null}
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan }: { plan: PricingPlanCard }) {
  const sortedVersions =
    Array.isArray(plan.versions) && plan.versions.length > 0
      ? [...plan.versions].sort((a, b) => Number(a.months) - Number(b.months))
      : [
          {
            id: "legacy-default",
            months: Number(plan.expiryMonths ?? 1),
            price: Number(plan.price ?? 0),
            originalPrice: Number(plan.originalPrice ?? plan.price ?? 0),
            discountedPrice: Number(plan.discountedPrice ?? plan.price ?? 0),
            embeddedLink: plan.embeddedLink,
            couponCode: plan.couponCode,
            billingLabel: plan.billingLabel,
            durationLabel: plan.durationLabel,
          },
        ];
  const [activeVersionId, setActiveVersionId] = useState(sortedVersions[0]?.id ?? "");
  const activeVersion =
    sortedVersions.find((version) => version.id === activeVersionId) ?? sortedVersions[0];

  return (
    <article className="relative flex h-full flex-col overflow-hidden rounded-[28px] border border-[#0f7896]/12 bg-white p-6 shadow-[0_16px_38px_rgba(15,120,150,0.08)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(15,120,150,0.14)]">
      <div className="absolute inset-x-0 top-0 h-1 bg-[#0f7896]" />

      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-[#0f7896]/10 text-[#0f7896]">
              <Sparkles className="h-4 w-4" />
            </span>
            {plan.tag ? (
              <span className="inline-flex rounded-full bg-[#0f7896]/10 px-3 py-1 text-xs font-semibold text-[#0f7896]">
                {plan.tag}
              </span>
            ) : null}
          </div>
          <h3 className="text-2xl font-semibold tracking-[-0.04em] text-[#071014]">
            {plan.name}
          </h3>
        </div>
        {plan.availabilityNote ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {plan.availabilityNote}
          </span>
        ) : null}
      </div>

      <p className="mt-4 text-sm leading-7 text-[#071014]/62">
        {plan.subtitle || "Custom access plan built from selected Urologics content."}
      </p>

      <div className="mt-5 rounded-2xl border border-[#0f7896]/10 bg-cyan-50 p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
              Choose Duration
            </p>
            <p className="mt-2 text-sm text-[#071014]/58">
              Pick the version that best matches how long you want access.
            </p>
          </div>
          <p className="text-xs font-medium text-[#071014]/55">
            {sortedVersions.length} option{sortedVersions.length > 1 ? "s" : ""}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {sortedVersions.map((version) => (
            <button
              key={version.id}
              type="button"
              onClick={() => setActiveVersionId(version.id)}
              className={`rounded-full border px-3 py-2 text-sm font-medium transition ${
                activeVersion.id === version.id
                  ? "border-[#0f7896] bg-[#0f7896] text-white"
                  : "border-[#0f7896]/12 bg-white text-[#0f7896] hover:border-[#0f7896]/30"
              }`}
            >
              {version.months} months
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6 flex-1 space-y-3">
        <div className="rounded-2xl bg-cyan-50 px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
            Access Included
          </p>
          <p className="mt-2 text-sm text-[#071014]/58">
            Built for candidates who want a structured and clearly scoped preparation path.
          </p>
        </div>

        {plan.featureBullets.map((feature) => (
          <AccessLine key={`${plan.id}-${feature}`} text={feature} />
        ))}

        {plan.courseItems.map((course) => (
          <AccessLine
            key={`${plan.id}-${course.id}`}
            text={course.title}
            meta={`${course.sectionsCount} sections · ${
              course.accessTier === "paid" ? "Paid course" : "Free course"
            }`}
          />
        ))}

        {plan.featureBullets.length === 0 && plan.courseItems.length === 0
          ? plan.items.map((item) => (
              <AccessLine
                key={`${plan.id}-${item.key}`}
                text={`${item.count} ${item.label}`}
                meta={
                  item.details.length > 0
                    ? `${item.details.slice(0, 3).join(", ")}${
                        item.details.length > 3 ? ` +${item.details.length - 3} more` : ""
                      }`
                    : undefined
                }
              />
            ))
          : null}

        {plan.featureBullets.length === 0 &&
        plan.courseItems.length === 0 &&
        plan.items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#0f7896]/12 bg-cyan-50 px-4 py-3 text-sm text-[#071014]/55">
            Custom access bundle
          </div>
        ) : null}

        <div className="rounded-2xl border border-[#0f7896]/10 bg-cyan-50 px-4 py-3 text-sm text-[#071014]/62">
          <div className="flex items-center gap-2 font-medium text-[#0f7896]">
            <Clock3 className="h-4 w-4" />
            <span>
              {activeVersion.durationLabel
                ? activeVersion.durationLabel
                : `Valid for ${pluralize(activeVersion.months, "month")}`}
            </span>
          </div>
          {activeVersion.billingLabel ? <p className="mt-2">{activeVersion.billingLabel}</p> : null}
          {plan.vivaMinutes ? <p className="mt-2">Includes {plan.vivaMinutes} AI viva minutes</p> : null}
        </div>
      </div>

      <div className="mt-8 border-t border-[#0f7896]/10 pt-5">
        {typeof activeVersion.originalPrice === "number" &&
        typeof activeVersion.discountedPrice === "number" &&
        activeVersion.discountedPrice < activeVersion.originalPrice ? (
          <div className="space-y-1">
            <p className="text-sm font-medium text-[#071014]/45 line-through">
              {formatGbp(activeVersion.originalPrice)}
            </p>
            <p className="text-3xl font-semibold tracking-[-0.04em] text-[#071014]">
              {formatGbp(activeVersion.discountedPrice)}
            </p>
          </div>
        ) : (
          <p className="text-3xl font-semibold tracking-[-0.04em] text-[#071014]">
            {formatGbp(activeVersion.discountedPrice ?? activeVersion.price)}
          </p>
        )}
        <p className="mt-1 text-sm text-[#071014]/55">
          One focused plan for a cleaner, faster enrolment decision.
        </p>
        {activeVersion.couponCode ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Coupon applied: {activeVersion.couponCode}
          </p>
        ) : null}
        <Button
          asChild={Boolean(activeVersion.embeddedLink || plan.embeddedLink)}
          className="mt-4 w-full rounded-full bg-[#0f7896] text-white hover:bg-[#0b647d]"
        >
          {activeVersion.embeddedLink || plan.embeddedLink ? (
            <a
              href={activeVersion.embeddedLink || plan.embeddedLink}
              target="_blank"
              rel="noreferrer"
            >
              Register Now
            </a>
          ) : (
            <span>Register Now</span>
          )}
        </Button>
      </div>
    </article>
  );
}

export function PricingCategoryAccordion({
  groupedPlans,
}: {
  groupedPlans: GroupedPlans[];
}) {
  const [openCategories, setOpenCategories] = useState<string[]>([]);

  const toggleCategory = (category: string) => {
    setOpenCategories((current) => (current.includes(category) ? [] : [category]));
  };

  return (
    <div className="space-y-6">
      {groupedPlans.map((group) => {
        const open = openCategories.includes(group.category);

        return (
          <section
            key={group.category}
            className="overflow-hidden rounded-[34px] border border-[#0f7896]/12 bg-white shadow-[0_18px_50px_rgba(15,120,150,0.08)]"
          >
            <button
              type="button"
              onClick={() => toggleCategory(group.category)}
              className="flex w-full items-center justify-between gap-6 bg-gradient-to-r from-white via-cyan-50/70 to-white px-6 py-6 text-left transition hover:bg-cyan-50/80"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-[#0f7896] text-white shadow-[0_10px_24px_rgba(15,120,150,0.22)]">
                  <Layers3 className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex rounded-full bg-[#0f7896]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
                      Category
                    </span>
                    <span className="inline-flex rounded-full border border-[#0f7896]/10 bg-white px-3 py-1 text-[11px] font-medium text-[#071014]/60">
                      {group.plans.length} plan{group.plans.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  <h2 className="mt-3 text-2xl font-semibold tracking-[-0.03em] text-[#071014]">
                    {group.category}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-6 text-[#071014]/58">
                    Compare the plans in this section and expand to see exactly what is included.
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 items-center gap-3">
                <div className="hidden rounded-full border border-[#0f7896]/12 bg-white px-4 py-2 text-sm font-semibold text-[#0f7896] sm:inline-flex">
                  {open ? "Hide plans" : "View plans"}
                </div>
                <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[#0f7896]/12 bg-white text-[#0f7896] shadow-sm">
                  {open ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                </div>
              </div>
            </button>

            {open ? (
              <div className="border-t border-[#0f7896]/10 bg-[#fbfeff] px-6 py-6">
                <div className="grid gap-5 lg:grid-cols-3">
                  {group.plans.map((plan) => (
                    <PlanCard key={plan.id} plan={plan} />
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
