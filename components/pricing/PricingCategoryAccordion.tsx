"use client";

import { type FormEvent, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  Layers3,
  Loader2,
  Search,
  ArrowRight,
  Tag,
  WandSparkles,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { PricingCardLayout, SynchronizedPricingGrid } from "@/components/pricing/SynchronizedPricingGrid";
import { cleanPricingFeatures, cleanPricingText, formatPricingDuration, formatPricingPlanName, pricingSearchFeedback } from "@/lib/pricingDisplay";

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
  eligibleCoupons: Array<{
    id: string;
    code: string;
    description: string;
    discountType: "percent" | "amount";
    discountValue: number;
  }>;
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
  categorySortOrder?: number;
  sortOrder?: number;
  isActive: boolean;
};

type GroupedPlans = {
  category: string;
  categorySortOrder: number;
  plans: PricingPlanCard[];
};

type AiPlanResult = {
  id: string;
  matchedBy: "content" | "plan-info";
  matchReason: string;
  matches: Array<{
    id: string;
    type: string;
    title: string;
    subtitle: string;
  }>;
};

function formatGbp(price: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(price);
}

function AccessLine({ text, meta }: { text: string; meta?: string }) {
  return (
    <div className="border-b border-[#0f7896]/[0.08] pb-2">
      <div className="flex items-start gap-3">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
        <div>
          <p className="text-sm leading-6 text-[#071014]/[0.72]">{text}</p>
          {meta ? <p className="mt-1 text-xs leading-6 text-[#071014]/55">{meta}</p> : null}
        </div>
      </div>
    </div>
  );
}

function PlanWaitlistButton({ plan }: { plan: PricingPlanCard }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    institution: "",
  });

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    try {
      setSaving(true);
      const response = await fetch("/api/pricing-plans/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planId: plan.id,
          name: form.name,
          email: form.email,
          institution: form.institution,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to join waitlist");
      }

      toast.success("You have joined the waitlist");
      setForm({ name: "", email: "", institution: "" });
      setOpen(false);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to join waitlist");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 w-full rounded-full bg-slate-800 text-white hover:bg-slate-950"
      >
        Join Waitlist
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[28px] border border-[#0f7896]/[0.14] bg-white p-6 shadow-[0_24px_70px_rgba(15,120,150,0.18)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#071014]">
              Join waitlist
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#071014]/60">
              Register interest for {formatPricingPlanName(plan.name)}. We will contact you when this plan opens.
            </DialogDescription>
          </DialogHeader>

          <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#071014]">Name</label>
              <Input
                required
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                className="h-11 rounded-xl"
                placeholder="Your name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#071014]">Email</label>
              <Input
                required
                type="email"
                value={form.email}
                onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
                className="h-11 rounded-xl"
                placeholder="you@example.com"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-[#071014]">Institution</label>
              <Input
                required
                value={form.institution}
                onChange={(event) =>
                  setForm((current) => ({ ...current, institution: event.target.value }))
                }
                className="h-11 rounded-xl"
                placeholder="Hospital / institution"
              />
            </div>
            <Button
              type="submit"
              disabled={saving}
              className="w-full rounded-full bg-[#0f7896] text-white hover:bg-[#0b647d]"
            >
              {saving ? "Joining..." : "Submit"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

function PlanCard({
  plan,
  aiResult,
}: {
  plan: PricingPlanCard;
  aiResult?: AiPlanResult;
}) {
  const isComingSoon = plan.isActive === false;
  const displayName = formatPricingPlanName(plan.name);
  const includedFeatures = cleanPricingFeatures([
    ...plan.featureBullets.map((text) => ({ text })),
    ...plan.courseItems.map((course) => ({ text: formatPricingPlanName(course.title) })),
  ]);
  const featureLines = includedFeatures.length > 0 ? includedFeatures : cleanPricingFeatures(plan.items.map((item) => ({
    text: `${item.count} ${item.label}`,
    meta: item.details.length > 0
      ? `${item.details.slice(0, 3).join(", ")}${item.details.length > 3 ? ` +${item.details.length - 3} more` : ""}`
      : undefined,
  })));
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
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    originalPrice: number;
    discountedPrice: number;
  } | null>(null);
  const [applyingCoupon, setApplyingCoupon] = useState("");
  const [couponError, setCouponError] = useState("");
  const activeVersion =
    sortedVersions.find((version) => version.id === activeVersionId) ?? sortedVersions[0];

  async function applyCoupon(code: string) {
    try {
      setApplyingCoupon(code);
      setCouponError("");
      const response = await fetch("/api/verify-coupon-web", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id, versionId: activeVersion.id, couponCode: code }),
      });
      const data = await response.json();
      if (!response.ok || !data.applied) throw new Error(data.error || "Coupon cannot be applied");
      setAppliedCoupon({
        code: String(data.coupon?.code || code),
        originalPrice: Number(data.pricing?.originalPrice ?? activeVersion.price),
        discountedPrice: Number(data.pricing?.discountedPrice ?? activeVersion.price),
      });
    } catch (error) {
      setAppliedCoupon(null);
      setCouponError(error instanceof Error ? error.message : "Coupon cannot be applied");
    } finally {
      setApplyingCoupon("");
    }
  }

  return (
    <PricingCardLayout
      id={plan.id}
      name={displayName}
      className={`rounded-[28px] border px-5 py-4 sm:px-7 sm:py-5 ${isComingSoon
        ? "border-slate-300 bg-slate-100 text-slate-700 shadow-[0_16px_38px_rgba(7,16,20,0.04)]"
        : "border-[#0f7896]/[0.12] bg-white shadow-[0_16px_44px_rgba(15,120,150,0.08)]"}`}
      disabled={isComingSoon}
      header={<>
        <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          {plan.tag || isComingSoon ? <div className="flex flex-wrap items-center gap-2">
            {plan.tag ? (
              <span className="inline-flex rounded-full bg-[#0f7896]/10 px-3 py-1 text-xs font-semibold text-[#0f7896]">
                {cleanPricingText(plan.tag)}
              </span>
            ) : null}
            {isComingSoon ? (
              <span className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                Coming soon
              </span>
            ) : null}
          </div> : null}
          <h3 className={`${plan.tag || isComingSoon ? "mt-2" : ""} text-2xl font-bold tracking-[-0.04em] text-[#071014]`}>
            {displayName}
          </h3>
        </div>
        {plan.availabilityNote ? (
          <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
            {cleanPricingText(plan.availabilityNote)}
          </span>
        ) : null}
      </div>

      {aiResult ? (
        <div className="mt-3 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-3">
          <div className="flex items-center gap-2 text-emerald-800">
            <WandSparkles className="h-4 w-4 shrink-0" />
            <p className="text-xs font-bold uppercase tracking-[0.14em]">Why AI chose this</p>
          </div>
          <p className="mt-2 text-sm leading-6 text-emerald-950/75">{aiResult.matchReason}</p>
          {aiResult.matches.length > 0 ? (
            <div className="mt-3 space-y-2">
              {aiResult.matches.slice(0, 3).map((match) => (
                <div key={`${aiResult.id}-${match.type}-${match.id}`} className="flex items-start gap-2 text-sm">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                  <p className="min-w-0 text-emerald-950">
                    <span className="font-semibold">{match.title}</span>
                    {match.subtitle ? <span className="text-emerald-900/55"> · {match.subtitle}</span> : null}
                  </p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
      </>}
      features={<>
        {featureLines.map((feature) => (
          <AccessLine key={`${plan.id}-${feature.text}`} text={feature.text} meta={feature.meta} />
        ))}
        {featureLines.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#0f7896]/[0.12] bg-cyan-50 px-4 py-3 text-sm text-[#071014]/55">
            Custom access bundle
          </div>
        ) : null}
      </>}
      footer={<aside className="min-w-0 border-t border-[#0f7896]/10 pt-2">
          <div>
            <div className="grid grid-cols-2 gap-2">
              {sortedVersions.map((version) => (
                <button
                  key={version.id}
                  type="button"
                  aria-pressed={activeVersion.id === version.id}
                  disabled={isComingSoon}
                  onClick={() => {
                    setActiveVersionId(version.id);
                    setAppliedCoupon(null);
                    setCouponError("");
                  }}
                  className={`min-h-10 rounded-full border px-3 py-2 text-sm font-medium transition ${
                    activeVersion.id === version.id
                      ? "border-[#0f7896] bg-[#0f7896] text-white"
                      : "border-[#0f7896]/15 bg-[#f8fdff] text-[#0f7896] hover:border-[#0f7896]/40"
                  }`}
                >
                  {formatPricingDuration(version.durationLabel, version.months)}
                </button>
              ))}
            </div>
          </div>

          {plan.eligibleCoupons.length > 0 ? (
            <div className="mt-3">
              <div className="flex items-center gap-2 text-amber-900">
                <Tag className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-[0.14em]">Eligible coupons</p>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {plan.eligibleCoupons.map((coupon) => {
                  const selected = appliedCoupon?.code === coupon.code;
                  return (
                    <button
                      key={coupon.id}
                      type="button"
                      disabled={Boolean(applyingCoupon)}
                      onClick={() => void applyCoupon(coupon.code)}
                      className={`inline-flex min-h-8 items-center gap-2 rounded-full border px-3 py-1.5 text-left transition ${selected ? "border-orange-500 bg-orange-100" : "border-amber-300 bg-amber-50 hover:border-orange-400 hover:bg-orange-50"}`}
                    >
                      <span className="text-xs font-bold text-amber-950">{coupon.code}</span>
                      <span className="text-xs text-amber-900/65">
                        {coupon.discountType === "percent" ? `${coupon.discountValue}% off` : `${formatGbp(coupon.discountValue)} off`}
                      </span>
                      {applyingCoupon === coupon.code ? (
                        <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                      ) : selected ? (
                        <CheckCircle2 className="h-4 w-4 text-orange-600" />
                      ) : (
                        <span className="text-[10px] font-semibold uppercase text-orange-700">Apply</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {couponError ? <p className="mt-2 text-xs font-medium text-rose-600">{couponError}</p> : null}
            </div>
          ) : null}

          {plan.vivaMinutes ? <p className="mt-2 text-xs text-[#071014]/60">Includes {plan.vivaMinutes} AI viva minutes</p> : null}

      <div className="mt-2 border-t border-[#0f7896]/10 pt-2">
        <AnimatePresence mode="wait" initial={false}>
        {appliedCoupon ? (
          <motion.div
            key={`${activeVersion.id}-${appliedCoupon.code}`}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 360, damping: 28 }}
          >
            <motion.p
              initial={{ width: 0 }}
              animate={{ width: "100%" }}
              className="w-fit overflow-hidden whitespace-nowrap text-sm font-medium text-[#071014]/45 line-through decoration-2 decoration-orange-500"
            >
              {formatGbp(appliedCoupon.originalPrice)}
            </motion.p>
            <p className="mt-1 text-3xl font-semibold text-emerald-700">
              {formatGbp(appliedCoupon.discountedPrice)}
            </p>
          </motion.div>
        ) : (
          <motion.p key={`${activeVersion.id}-price`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-semibold tracking-[-0.04em] text-[#071014]">
            {formatGbp(activeVersion.price)}
          </motion.p>
        )}
        </AnimatePresence>
        {isComingSoon ? (
          <>
            <div className="mt-2 rounded-2xl border border-slate-300 bg-white/80 px-4 py-2 text-center text-sm font-medium leading-6 text-slate-700">
              This plan is coming soon, please join the waitlist.
            </div>
            <PlanWaitlistButton plan={plan} />
          </>
        ) : (
          <Button
            asChild
            className="group mt-2 min-h-10 w-full rounded-full bg-[#0f7896] text-white shadow-[0_6px_16px_rgba(15,120,150,0.18)] hover:bg-[#0b647d]"
          >
            <a href={`/checkout?planId=${encodeURIComponent(plan.id)}&versionId=${encodeURIComponent(activeVersion.id)}${appliedCoupon ? `&couponCode=${encodeURIComponent(appliedCoupon.code)}` : ""}`}>
              Continue to payment
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </a>
          </Button>
        )}

      </div>
        </aside>}
    />
  );
}

const searchHints = [
  "Search courses, topics, mocks, or AI viva",
  'Try: “Find plans with AI viva”',
];

function subscribeToMotionPreference(listener: () => void) {
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  preference.addEventListener("change", listener);
  return () => preference.removeEventListener("change", listener);
}

function getReducedMotionPreference() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function PricingSearchHint({ paused }: { paused: boolean }) {
  const [index, setIndex] = useState(0);
  const reducedMotion = useSyncExternalStore(subscribeToMotionPreference, getReducedMotionPreference, () => true);

  useEffect(() => {
    if (paused || reducedMotion !== false) return;
    const timer = window.setInterval(() => setIndex((current) => (current + 1) % searchHints.length), 4000);
    return () => window.clearInterval(timer);
  }, [paused, reducedMotion]);

  if (paused) return null;
  const hint = searchHints[reducedMotion ? 0 : index];

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-y-0 left-12 right-11 flex items-center overflow-hidden"
      data-pricing-search-hint=""
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={hint}
          initial={{ opacity: 0, y: reducedMotion ? 0 : 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: reducedMotion ? 0 : -6 }}
          transition={{ duration: reducedMotion ? 0 : 0.18, ease: "easeOut" }}
          className="block w-full truncate text-sm text-[#071014]/50"
        >
          {hint}
        </motion.span>
      </AnimatePresence>
    </div>
  );
}

export function PricingCategoryAccordion({
  groupedPlans,
}: {
  groupedPlans: GroupedPlans[];
}) {
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchFocused, setSearchFocused] = useState(false);
  const [aiResults, setAiResults] = useState<AiPlanResult[] | null>(null);
  const [aiSearching, setAiSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const searchFeedback = pricingSearchFeedback({
    query: searchQuery,
    searching: aiSearching,
    error: searchError,
    hasAiResults: aiResults !== null,
  });

  const visibleGroups = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return groupedPlans
      .map((group) => ({
        ...group,
        plans: group.plans.filter((plan) => {
          if (aiResults && !aiResults.some((result) => result.id === plan.id)) return false;
          if (!query || aiResults) return true;
          return [
            plan.name,
            plan.category,
            plan.tag,
            plan.subtitle,
            ...plan.featureBullets,
            ...plan.courseItems.map((course) => course.title),
            ...plan.items.flatMap((item) => item.details),
          ].some((value) => cleanPricingText(String(value || "")).toLowerCase().includes(query));
        }),
      }))
      .filter((group) => group.plans.length > 0);
  }, [aiResults, groupedPlans, searchQuery]);

  async function runAiSearch() {
    const query = searchQuery.trim();
    if (query.length < 3) {
      setSearchError("Enter at least 3 characters for AI search.");
      return;
    }
    try {
      setAiSearching(true);
      setSearchError("");
      const response = await fetch("/api/public/plans/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, limit: 10 }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to search plans");
      const results: AiPlanResult[] = Array.isArray(data.plans)
        ? data.plans.map((plan: AiPlanResult) => ({
            id: String(plan.id || ""),
            matchedBy: plan.matchedBy === "plan-info" ? "plan-info" : "content",
            matchReason: String(plan.matchReason || "This plan is relevant to your search."),
            matches: Array.isArray(plan.matches) ? plan.matches : [],
          })).filter((plan: AiPlanResult) => Boolean(plan.id))
        : [];
      setAiResults(results);
      setOpenCategories(groupedPlans.map((group) => group.category));
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "Unable to search plans");
    } finally {
      setAiSearching(false);
    }
  }

  const toggleCategory = (category: string) => {
    setOpenCategories((current) => (current.includes(category) ? current.filter((item) => item !== category) : [...current, category]));
  };

  return (
    <div className="space-y-6">
      <div role="search" aria-label="Find a preparation plan" className="bg-transparent" data-pricing-search="">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0f7896]" />
            <Input
              value={searchQuery}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setSearchFocused(false)}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setAiResults(null);
                setSearchError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void runAiSearch();
              }}
              className="h-12 rounded-full border-[#0f7896]/20 bg-transparent pl-12 pr-11 shadow-none hover:border-[#0f7896]/40 focus-visible:border-[#0f7896] focus-visible:ring-2 focus-visible:ring-[#0f7896]/15 dark:bg-transparent"
              placeholder={searchFocused ? searchHints[0] : ""}
              aria-label="Search plans"
            />
            <PricingSearchHint paused={searchFocused || searchQuery.length > 0} />
            {searchQuery ? (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setAiResults(null);
                  setSearchError("");
                }}
                className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center text-[#071014]/45 transition hover:text-[#071014] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0f7896]"
                aria-label="Clear search"
                title="Clear search"
              >
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <Button
            type="button"
            onClick={() => void runAiSearch()}
            disabled={aiSearching || searchQuery.trim().length < 3}
            className="h-12 rounded-full bg-[#0f7896] px-6 text-white hover:bg-[#0b647d]"
          >
            {aiSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : <WandSparkles className="h-4 w-4" />}
            AI search
          </Button>
        </div>
        {searchError || aiResults ? (
          <div className={`mt-3 border-l-2 px-3 text-sm ${searchError ? "border-rose-400 text-rose-600" : "border-emerald-500 text-emerald-800"}`}>
            {searchError || `${aiResults?.length || 0} plan${aiResults?.length === 1 ? "" : "s"} matched. Open a category to see why each was selected.`}
          </div>
        ) : null}
      </div>

      {visibleGroups.length === 0 ? (
        <div role="status" aria-live="polite" className="border-y border-[#0f7896]/[0.12] bg-white py-12 text-center" data-pricing-search-feedback="">
          <p className="font-semibold text-[#071014]">{searchFeedback.title}</p>
          <p className="mt-2 text-sm text-[#071014]/55">{searchFeedback.detail}</p>
        </div>
      ) : null}

      {visibleGroups.map((group) => {
        const open = openCategories.includes(group.category);

        return (
          <section
            key={group.category}
            className="overflow-hidden rounded-[32px] border border-[#0f7896]/[0.12] bg-white shadow-[0_18px_50px_rgba(15,120,150,0.08)]"
          >
            <button
              type="button"
              aria-expanded={open}
              onClick={() => toggleCategory(group.category)}
              className="flex w-full items-center justify-between gap-5 bg-gradient-to-r from-white via-cyan-50/70 to-white px-5 py-6 text-left transition hover:bg-cyan-50 sm:px-7"
            >
              <div className="flex min-w-0 items-center gap-4">
                <div className="flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-2xl bg-[#0f7896] text-white shadow-[0_10px_24px_rgba(15,120,150,0.22)]">
                  <Layers3 className="h-6 w-6" />
                </div>

                <div className="min-w-0">
                  <h2 className="mt-2 text-xl font-bold tracking-[-0.03em] text-[#071014] sm:text-2xl">
                    {group.category}
                  </h2>
                </div>
              </div>

              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[#0f7896]/[0.12] bg-white text-[#0f7896] transition-transform duration-300 ${open ? "rotate-180" : ""}`}><ChevronDown className="h-5 w-5" /></span>
            </button>

            {open ? (
              <div className="border-t border-[#0f7896]/10 bg-[#fbfeff] p-4 sm:p-6">
                <SynchronizedPricingGrid className="grid items-start gap-5 md:grid-cols-2 xl:grid-cols-3">
                  {group.plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      aiResult={aiResults?.find((result) => result.id === plan.id)}
                    />
                  ))}
                </SynchronizedPricingGrid>
              </div>
            ) : null}
          </section>
        );
      })}
    </div>
  );
}
