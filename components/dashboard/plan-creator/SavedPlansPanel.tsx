"use client";

import { useMemo, useState } from "react";
import { ChevronDown, Layers3, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/client/adminApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PlanCountBadge } from "@/components/dashboard/plan-creator/SelectionGroup";
import { EmptyState } from "@/components/dashboard/shared/EmptyState";
import type { PricingPlan } from "@/components/dashboard/plan-creator/types";

function formatGbp(price: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(price);
}

export function SavedPlansPanel({
  plans,
  loading,
  onEdit,
  onDelete,
  onCategoryOrderUpdated,
}: {
  plans: PricingPlan[];
  loading: boolean;
  onEdit: (plan: PricingPlan) => void;
  onDelete: (id: string) => void;
  onCategoryOrderUpdated: () => Promise<void>;
}) {
  const [openCategories, setOpenCategories] = useState<string[]>([]);
  const [categoryOrders, setCategoryOrders] = useState<Record<string, number>>({});
  const [savingCategory, setSavingCategory] = useState<string | null>(null);
  const groupedPlans = useMemo(() => {
    const groups = new Map<string, { categorySortOrder: number; plans: PricingPlan[] }>();
    plans.forEach((plan) => {
      const category = plan.category?.trim() || "Programs";
      const categoryKey = category.toLocaleLowerCase();
      const existing = groups.get(categoryKey) || {
        categorySortOrder: Number(plan.categorySortOrder ?? 0),
        plans: [],
      };
      existing.categorySortOrder = Math.min(
        existing.categorySortOrder,
        Number(plan.categorySortOrder ?? 0),
      );
      existing.plans.push(plan);
      groups.set(categoryKey, existing);
    });
    return Array.from(groups.entries())
      .map(([, group]) => ({
        category: group.plans[0]?.category?.trim() || "Programs",
        categorySortOrder: group.categorySortOrder,
        plans: group.plans.sort((left, right) => {
          const order = Number(left.sortOrder ?? 0) - Number(right.sortOrder ?? 0);
          if (order !== 0) return order;
          const price = Number(left.price ?? 0) - Number(right.price ?? 0);
          return price !== 0 ? price : left.name.localeCompare(right.name);
        }),
      }))
      .sort((left, right) =>
        left.categorySortOrder - right.categorySortOrder ||
        left.category.localeCompare(right.category),
      );
  }, [plans]);

  const toggleCategory = (category: string) => {
    setOpenCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );
  };

  const saveCategoryOrder = async (category: string, currentOrder: number) => {
    const categorySortOrder = categoryOrders[category] ?? currentOrder;
    if (!Number.isInteger(categorySortOrder) || categorySortOrder < 0) {
      toast.error("Category sort order must be a non-negative integer");
      return;
    }
    try {
      setSavingCategory(category);
      const response = await adminFetch("/api/pricing-plans/categories/order", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, categorySortOrder }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Failed to update category order");
      await onCategoryOrderUpdated();
      setCategoryOrders((current) => {
        const next = { ...current };
        delete next[category];
        return next;
      });
      toast.success("Category order updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update category order");
    } finally {
      setSavingCategory(null);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Saved plans</h2>
            <p className="mt-1 text-sm text-slate-500">
              Existing pricing plans created from your catalog and presets.
            </p>
          </div>
          <Badge variant="outline" className="border-slate-200 text-slate-600">
            {plans.length} total
          </Badge>
        </div>

        {loading ? (
          <p className="text-sm text-slate-500">Loading plans...</p>
        ) : plans.length === 0 ? (
          <EmptyState
            icon={Layers3}
            title="No pricing plans created yet"
            description="Your saved plan catalog will show up here once the first plan is created."
          />
        ) : (
          <div className="space-y-3">
            {groupedPlans.map((group) => {
              const open = openCategories.includes(group.category);
              return (
                <section key={group.category} className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                  <div className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left transition hover:bg-slate-100">
                    <div className="min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleCategory(group.category)}
                        aria-expanded={open}
                        aria-controls={`saved-plans-${group.category.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
                        className="flex flex-wrap items-center gap-2 text-left"
                      >
                        <h3 className="font-semibold text-slate-900">{group.category}</h3>
                        <Badge variant="outline">{group.plans.length} plan{group.plans.length === 1 ? "" : "s"}</Badge>
                      </button>
                      <div className="mt-2 flex flex-wrap items-center gap-2">
                        <label className="text-xs font-medium text-slate-500" htmlFor={`category-order-${group.category.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}>
                          Sort order
                        </label>
                        <input
                          id={`category-order-${group.category.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
                          type="number"
                          min="0"
                          step="1"
                          value={categoryOrders[group.category] ?? group.categorySortOrder}
                          onChange={(event) => setCategoryOrders((current) => ({ ...current, [group.category]: Number(event.target.value || 0) }))}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") void saveCategoryOrder(group.category, group.categorySortOrder);
                          }}
                          className="h-8 w-20 rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-8"
                          disabled={savingCategory === group.category || categoryOrders[group.category] === undefined}
                          onClick={() => {
                            void saveCategoryOrder(group.category, group.categorySortOrder);
                          }}
                        >
                          {savingCategory === group.category ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
                          Save
                        </Button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => toggleCategory(group.category)}
                      aria-expanded={open}
                      aria-controls={`saved-plans-${group.category.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`}
                      aria-label={`${open ? "Collapse" : "Expand"} ${group.category}`}
                      className="rounded-md p-2 hover:bg-white"
                    >
                      <ChevronDown className={`h-5 w-5 text-slate-500 transition-transform ${open ? "rotate-180" : ""}`} />
                    </button>
                  </div>
                  {open ? (
                    <div id={`saved-plans-${group.category.replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`} className="space-y-3 border-t border-slate-200 p-3">
            {group.plans.map((plan) => {
              const versions =
                Array.isArray(plan.versions) && plan.versions.length > 0
                  ? [...plan.versions].sort((a, b) => Number(a.months) - Number(b.months))
                  : [];
              const startingPrice = Math.min(
                ...(versions.map((version) => Number(version.discountedPrice ?? version.price ?? 0))
                  .filter((value) => Number.isFinite(value) && value >= 0)
                  .concat(Number(plan.discountedPrice ?? plan.price ?? 0)))
              );

              return (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">{plan.name}</p>
                        {plan.tag ? (
                          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                            {plan.tag}
                          </Badge>
                        ) : null}
                        <Badge
                          className={
                            plan.isActive
                              ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                          }
                        >
                          {plan.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {plan.description || "No description added yet."}
                      </p>
                      {plan.category ? (
                        <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                          {plan.category}
                        </p>
                      ) : null}
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                        {versions.length || 1} version{versions.length === 1 ? "" : "s"}
                      </p>
                      <p className="mt-1 text-xl font-semibold text-slate-900">
                        From {formatGbp(startingPrice)}
                      </p>
                    </div>
                  </div>

                  {versions.length ? (
                    <div className="mt-4 grid gap-2">
                      {versions.map((version) => (
                        <div
                          key={`${plan.id}-${version.id}`}
                          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-slate-900">{version.months} months</p>
                            <p className="mt-1 text-xs text-slate-500">
                              {version.durationLabel ||
                                `${version.months} month${version.months > 1 ? "s" : ""}`}
                              {version.billingLabel ? ` · ${version.billingLabel}` : ""}
                            </p>
                          </div>
                          <div className="text-right">
                            {typeof version.originalPrice === "number" &&
                            typeof version.discountedPrice === "number" &&
                            version.discountedPrice < version.originalPrice ? (
                              <p className="text-xs text-slate-400 line-through">
                                {formatGbp(version.originalPrice)}
                              </p>
                            ) : null}
                            <p className="font-semibold text-slate-900">
                              {formatGbp(Number(version.discountedPrice ?? version.price ?? 0))}
                            </p>
                            {version.couponCode ? (
                              <p className="mt-1 text-xs font-medium text-emerald-700">
                                {version.couponCode}
                              </p>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}

                  {plan.featureBullets?.length ? (
                    <div className="mt-4 flex flex-wrap gap-2 text-xs">
                      {plan.featureBullets.map((feature) => (
                        <span
                          key={`${plan.id}-${feature}`}
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 flex flex-wrap gap-2 text-xs">
                    {plan.accessScopes?.courseIds?.length ? (
                      <PlanCountBadge label="Courses" value={plan.accessScopes.courseIds.length} />
                    ) : null}
                    {plan.accessScopes?.chapterGroupIds?.length ? (
                      <PlanCountBadge
                        label="Chapter Groups"
                        value={plan.accessScopes.chapterGroupIds.length}
                      />
                    ) : null}
                    {plan.accessScopes?.videoSectionIds?.length ? (
                      <PlanCountBadge
                        label="Video Sections"
                        value={plan.accessScopes.videoSectionIds.length}
                      />
                    ) : null}
                    {plan.accessScopes?.vivaFolderIds?.length ? (
                      <PlanCountBadge
                        label="Viva Folders"
                        value={plan.accessScopes.vivaFolderIds.length}
                      />
                    ) : null}
                    {plan.vivaMinutes ? (
                      <PlanCountBadge label="Viva Minutes" value={plan.vivaMinutes} />
                    ) : null}
                    <PlanCountBadge label="Chapters" value={plan.contentCounts?.chapters ?? 0} />
                    <PlanCountBadge label="Videos" value={plan.contentCounts?.videos ?? 0} />
                    <PlanCountBadge label="Quizzes" value={plan.contentCounts?.quizzes ?? 0} />
                    <PlanCountBadge label="Mocks" value={plan.contentCounts?.mocks ?? 0} />
                    <PlanCountBadge label="Viva" value={plan.contentCounts?.vivaCases ?? 0} />
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => onEdit(plan)}>
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                      onClick={() => onDelete(plan.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              );
            })}
                    </div>
                  ) : null}
                </section>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
