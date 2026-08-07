"use client";

import { type FormEvent, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock3,
  Layers3,
  Loader2,
  Search,
  Sparkles,
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
  sortOrder?: number;
  isActive: boolean;
};

type GroupedPlans = {
  category: string;
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
        className="mt-4 w-full rounded-full bg-slate-800 text-white hover:bg-slate-950"
      >
        Join Waitlist
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="rounded-[28px] border border-[#0f7896]/14 bg-white p-6 shadow-[0_24px_70px_rgba(15,120,150,0.18)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-semibold tracking-[-0.04em] text-[#071014]">
              Join waitlist
            </DialogTitle>
            <DialogDescription className="text-sm leading-6 text-[#071014]/60">
              Register interest for {plan.name}. We will contact you when this plan opens.
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

function PlanCard({ plan, aiResult }: { plan: PricingPlanCard; aiResult?: AiPlanResult }) {
  const isComingSoon = plan.isActive === false;
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
    <article
      className={`relative flex h-full flex-col overflow-hidden rounded-[28px] border p-6 transition duration-300 ${
        isComingSoon
          ? "border-slate-300 bg-slate-100 text-slate-700 shadow-[0_16px_38px_rgba(7,16,20,0.04)]"
          : "border-[#0f7896]/12 bg-white shadow-[0_16px_38px_rgba(15,120,150,0.08)] hover:-translate-y-1 hover:shadow-[0_22px_50px_rgba(15,120,150,0.14)]"
      }`}
      data-disabled={isComingSoon || undefined}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-[#0f7896]" />

      <div className="grid gap-6 md:grid-cols-[minmax(0,1.15fr)_minmax(240px,0.85fr)] md:gap-8">
        <div className="min-w-0">

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
            {isComingSoon ? (
              <span className="inline-flex rounded-full border border-slate-300 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                Coming soon
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

      {aiResult ? (
        <div className="mt-5 border-l-4 border-emerald-500 bg-emerald-50 px-4 py-4">
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

      <div className="mt-5 space-y-2">

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

      </div>
        </div>

        <aside className="flex min-w-0 flex-col border-t border-[#0f7896]/10 pt-6 md:border-l md:border-t-0 md:pl-8 md:pt-0">
          <div>
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
                Choose duration
              </p>
              <p className="text-xs font-medium text-[#071014]/55">
                {sortedVersions.length} option{sortedVersions.length > 1 ? "s" : ""}
              </p>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              {sortedVersions.map((version) => (
                <button
                  key={version.id}
                  type="button"
                  disabled={isComingSoon}
                  onClick={() => {
                    setActiveVersionId(version.id);
                    setAppliedCoupon(null);
                    setCouponError("");
                  }}
                  className={`min-h-10 border px-3 py-2 text-sm font-medium transition ${
                    activeVersion.id === version.id
                      ? "border-[#0f7896] bg-[#0f7896] text-white"
                      : "border-[#0f7896]/15 bg-[#f8fdff] text-[#0f7896] hover:border-[#0f7896]/40"
                  }`}
                >
                  {version.months} months
                </button>
              ))}
            </div>
          </div>

          {plan.eligibleCoupons.length > 0 ? (
            <div className="mt-4 border border-amber-300 bg-amber-50 p-3">
              <div className="flex items-center gap-2 text-amber-900">
                <Tag className="h-4 w-4" />
                <p className="text-xs font-bold uppercase tracking-[0.14em]">Eligible coupons</p>
              </div>
              <div className="mt-3 space-y-2">
                {plan.eligibleCoupons.map((coupon) => {
                  const selected = appliedCoupon?.code === coupon.code;
                  return (
                    <button
                      key={coupon.id}
                      type="button"
                      disabled={Boolean(applyingCoupon)}
                      onClick={() => void applyCoupon(coupon.code)}
                      className={`flex w-full items-center justify-between gap-3 border px-3 py-2 text-left transition ${selected ? "border-orange-500 bg-orange-100" : "border-amber-200 bg-white hover:border-orange-400 hover:bg-orange-50"}`}
                    >
                      <span>
                        <span className="block text-sm font-bold text-amber-950">{coupon.code}</span>
                        <span className="block text-xs text-amber-900/65">
                          {coupon.discountType === "percent" ? `${coupon.discountValue}% off` : `${formatGbp(coupon.discountValue)} off`}
                        </span>
                      </span>
                      {applyingCoupon === coupon.code ? (
                        <Loader2 className="h-4 w-4 animate-spin text-orange-600" />
                      ) : selected ? (
                        <CheckCircle2 className="h-4 w-4 text-orange-600" />
                      ) : (
                        <span className="text-xs font-semibold text-orange-700">Apply</span>
                      )}
                    </button>
                  );
                })}
              </div>
              {couponError ? <p className="mt-2 text-xs font-medium text-rose-600">{couponError}</p> : null}
            </div>
          ) : null}

          <div className="mt-4 border-l-2 border-[#0f7896] bg-cyan-50 px-4 py-3 text-sm text-[#071014]/62">
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

      <div className="mt-5 border-t border-[#0f7896]/10 pt-5">
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
        ) : typeof activeVersion.originalPrice === "number" &&
        typeof activeVersion.discountedPrice === "number" &&
        activeVersion.discountedPrice < activeVersion.originalPrice ? (
          <motion.div key={`${activeVersion.id}-default-discount`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-1">
            <p className="text-sm font-medium text-[#071014]/45 line-through">
              {formatGbp(activeVersion.originalPrice)}
            </p>
            <p className="text-3xl font-semibold tracking-[-0.04em] text-[#071014]">
              {formatGbp(activeVersion.discountedPrice)}
            </p>
          </motion.div>
        ) : (
          <motion.p key={`${activeVersion.id}-price`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-3xl font-semibold tracking-[-0.04em] text-[#071014]">
            {formatGbp(activeVersion.discountedPrice ?? activeVersion.price)}
          </motion.p>
        )}
        </AnimatePresence>
        <p className="mt-1 text-sm text-[#071014]/55">
          One focused plan for a cleaner, faster enrolment decision.
        </p>
        {activeVersion.couponCode ? (
          <p className="mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-700">
            Coupon applied: {activeVersion.couponCode}
          </p>
        ) : null}
        {isComingSoon ? (
          <>
            <div className="mt-4 rounded-2xl border border-slate-300 bg-white/80 px-4 py-3 text-center text-sm font-medium leading-6 text-slate-700">
              This plan is coming soon, please join the waitlist.
            </div>
            <PlanWaitlistButton plan={plan} />
          </>
        ) : (
          <Button
            asChild={Boolean(activeVersion.embeddedLink || plan.embeddedLink)}
            className="mt-4 w-full rounded-full bg-[#0f7896] text-white hover:bg-[#0b647d]"
          >
            {activeVersion.embeddedLink || plan.embeddedLink ? (
            <a href={`/checkout?planId=${encodeURIComponent(plan.id)}&versionId=${encodeURIComponent(activeVersion.id)}${appliedCoupon ? `&couponCode=${encodeURIComponent(appliedCoupon.code)}` : ""}`}>
              Continue to checkout
            </a>
          ) : (
            <span>Register Now</span>
          )}
          </Button>
        )}
      </div>
        </aside>
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
  const [searchQuery, setSearchQuery] = useState("");
  const [aiResults, setAiResults] = useState<AiPlanResult[] | null>(null);
  const [aiSearching, setAiSearching] = useState(false);
  const [searchError, setSearchError] = useState("");

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
          ].some((value) => String(value || "").toLowerCase().includes(query));
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
    setOpenCategories((current) => (current.includes(category) ? [] : [category]));
  };

  return (
    <div className="space-y-6">
      <div className="border-y border-[#0f7896]/12 bg-white px-4 py-5 shadow-[0_12px_32px_rgba(15,120,150,0.06)] sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-[#0f7896]" />
            <Input
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                setAiResults(null);
                setSearchError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") void runAiSearch();
              }}
              className="h-12 rounded-lg border-[#0f7896]/20 bg-[#f8fdff] pl-12 pr-11 shadow-none focus-visible:border-[#0f7896] focus-visible:ring-[#0f7896]/15"
              placeholder="Search courses, topics, mocks, or AI viva"
              aria-label="Search plans"
            />
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
            className="h-12 rounded-lg bg-[#0f7896] px-5 text-white hover:bg-[#0b647d]"
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
        <div className="border-y border-[#0f7896]/12 bg-white py-12 text-center">
          <p className="font-semibold text-[#071014]">No matching plans found</p>
          <p className="mt-2 text-sm text-[#071014]/55">Try a broader topic or describe what you want to practise.</p>
        </div>
      ) : null}

      {visibleGroups.map((group) => {
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
                <div className="grid gap-5 xl:grid-cols-2">
                  {group.plans.map((plan) => (
                    <PlanCard
                      key={plan.id}
                      plan={plan}
                      aiResult={aiResults?.find((result) => result.id === plan.id)}
                    />
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
