"use client";

import type { Dispatch, SetStateAction } from "react";
import { ArrowDownToLine, Crown, Plus, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { createEmptyPlanVersion, expiryPresets, vivaMinutePresets } from "@/components/dashboard/plan-creator/constants";
import type { PlanFormValues, PricingCoupon } from "@/components/dashboard/plan-creator/types";

function formatGbp(price: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(price);
}

export function PlanFormCard({
  editingId,
  form,
  setForm,
  coupons,
  totalScopedGroups,
  totalSelected,
  saving,
  onSave,
}: {
  editingId: string | null;
  form: PlanFormValues;
  setForm: Dispatch<SetStateAction<PlanFormValues>>;
  coupons: PricingCoupon[];
  totalScopedGroups: number;
  totalSelected: number;
  saving: boolean;
  onSave: () => void;
}) {
  const updateVersion = (
    versionId: string,
    patch: Partial<PlanFormValues["versions"][number]>
  ) => {
    setForm((prev) => ({
      ...prev,
      versions: prev.versions.map((version) =>
        version.id === versionId ? { ...version, ...patch } : version
      ),
    }));
  };

  const addVersion = (months: number) => {
    setForm((prev) => {
      if (prev.versions.some((version) => Number(version.months) === months)) {
        return prev;
      }

      return {
        ...prev,
        versions: [...prev.versions, createEmptyPlanVersion(months)],
      };
    });
  };

  const removeVersion = (versionId: string) => {
    setForm((prev) => ({
      ...prev,
      versions:
        prev.versions.length === 1
          ? prev.versions
          : prev.versions.filter((version) => version.id !== versionId),
    }));
  };

  const versionPreview = form.versions.map((version) => {
    const coupon = coupons.find((item) => item.id === form.marketingCouponId) || null;
    const originalPrice = Number(version.price || 0);

    if (!coupon) {
      return {
        id: version.id,
        originalPrice,
        discountedPrice: originalPrice,
        hasDiscount: false,
      };
    }

    const discountedPrice =
      coupon.discountType === "percent"
        ? Math.max(
            0,
            Math.round((originalPrice - (originalPrice * coupon.discountValue) / 100) * 100) / 100
          )
        : Math.max(0, Math.round((originalPrice - coupon.discountValue) * 100) / 100);

    return {
      id: version.id,
      originalPrice,
      discountedPrice,
      hasDiscount: discountedPrice < originalPrice,
    };
  });

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {editingId ? "Edit plan" : "Create plan"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Set shared plan details once, then add 3, 6, 9, or 12 month versions underneath.
            </p>
          </div>
          {editingId ? (
            <Badge variant="outline" className="border-slate-200 text-slate-600">
              Editing
            </Badge>
          ) : null}
        </div>

        <div className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="plan-name">Plan name</Label>
            <Input
              id="plan-name"
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              placeholder="Urologics ELITE Viva"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-description">Description</Label>
            <Textarea
              id="plan-description"
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Designed for candidates who need the full live course plus AI viva time."
              className="min-h-[110px]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label htmlFor="plan-tag">Tag (optional)</Label>
              <Input
                id="plan-tag"
                value={form.tag}
                onChange={(event) => setForm((prev) => ({ ...prev, tag: event.target.value }))}
                placeholder="Best Value"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-category">Category</Label>
              <Input
                id="plan-category"
                value={form.category}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, category: event.target.value }))
                }
                placeholder="FRCS Urology Section 2"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-sort-order">Category sort order</Label>
              <Input
                id="category-sort-order"
                type="number"
                min="0"
                step="1"
                value={form.categorySortOrder}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    categorySortOrder: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-availability">Availability note</Label>
              <Input
                id="plan-availability"
                value={form.availabilityNote}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, availabilityNote: event.target.value }))
                }
                placeholder="Limited slots only"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-sort-order">Plan sort order</Label>
              <Input
                id="plan-sort-order"
                type="number"
                min="0"
                step="1"
                value={form.sortOrder}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sortOrder: Number(event.target.value || 0),
                  }))
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="plan-features">Feature bullets</Label>
            <Textarea
              id="plan-features"
              value={form.featureBulletsText}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, featureBulletsText: event.target.value }))
              }
              placeholder={
                "Live Lectures + Viva Practice\nFull Recordings Access\nAI Viva Mock (500 minutes)"
              }
              className="min-h-[120px]"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-viva-minutes">AI viva minutes</Label>
              <Input
                id="plan-viva-minutes"
                type="number"
                min="0"
                step="10"
                value={form.vivaMinutes}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    vivaMinutes: Number(event.target.value || 0),
                  }))
                }
                placeholder="500"
              />
              <p className="text-xs text-slate-500">
                One viva is typically around 10 minutes. 500 minutes is roughly 50 viva sessions.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Quick viva presets</Label>
              <div className="flex flex-wrap gap-2">
                {vivaMinutePresets.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, vivaMinutes: value }))}
                    className={`rounded-full border px-3 py-1.5 text-sm transition ${
                      Number(form.vivaMinutes) === value
                        ? "border-slate-900 bg-slate-900 text-white"
                        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {value} min
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-sm font-semibold text-slate-900">Eligible coupons</p>
            <p className="mt-1 text-xs text-slate-500">
              Attach multiple coupons. A customer can apply only one coupon at checkout.
            </p>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {coupons.length ? coupons.map((coupon) => {
                const checked = form.eligibleCouponIds.includes(coupon.id);
                return (
                  <label key={coupon.id} className="flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => setForm((prev) => {
                        const eligibleCouponIds = checked
                          ? prev.eligibleCouponIds.filter((id) => id !== coupon.id)
                          : [...prev.eligibleCouponIds, coupon.id];
                        return {
                          ...prev,
                          eligibleCouponIds,
                          marketingCouponId:
                            checked && prev.marketingCouponId === coupon.id
                              ? ""
                              : prev.marketingCouponId,
                        };
                      })}
                    />
                    <span className="text-sm text-slate-700">
                      {coupon.code} · {coupon.discountType === "percent"
                        ? `${coupon.discountValue}% off`
                        : `£${coupon.discountValue} off`}
                      {!coupon.isActive ? " · inactive" : ""}
                    </span>
                  </label>
                );
              }) : <p className="text-sm text-slate-500">Create a coupon before attaching it.</p>}
            </div>
            <div className="mt-4 space-y-2">
              <Label>Coupon shown on marketing app/website</Label>
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                value={form.marketingCouponId}
                onChange={(event) => setForm((prev) => ({ ...prev, marketingCouponId: event.target.value }))}
              >
                <option value="">Do not advertise a coupon</option>
                {coupons
                  .filter((coupon) => form.eligibleCouponIds.includes(coupon.id) && coupon.isActive)
                  .map((coupon) => <option key={coupon.id} value={coupon.id}>{coupon.code}</option>)}
              </select>
              <p className="text-xs text-slate-500">
                Other attached coupons remain eligible when entered manually.
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Plan versions</p>
                <p className="mt-1 text-xs text-slate-500">
                  Add the plan durations you want to offer. Each version can have its own price,
                  billing label and checkout link.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {expiryPresets.map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => addVersion(months)}
                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-sm text-slate-600 transition hover:border-slate-300"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {months} months
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-4 space-y-4">
              {form.versions
                .slice()
                .sort((a, b) => Number(a.months) - Number(b.months))
                .map((version) => {
                  const preview =
                    versionPreview.find((item) => item.id === version.id) || versionPreview[0];
                  const monthlyLabelSuggestion =
                    Number(version.price) > 0 && Number(version.months) > 0
                      ? `£${Math.round(Number(version.price) / Number(version.months))}/month`
                      : "";

                  return (
                    <div key={version.id} className="rounded-2xl border border-slate-200 bg-white p-4">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-900">
                            {version.months} month version
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            This version is what users will switch to on the pricing page.
                          </p>
                        </div>
                        {form.versions.length > 1 ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => removeVersion(version.id)}
                          >
                            <Trash2 className="mr-1.5 h-4 w-4" />
                            Remove
                          </Button>
                        ) : null}
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Months</Label>
                          <Input
                            type="number"
                            min="1"
                            value={version.months}
                            onChange={(event) =>
                              updateVersion(version.id, {
                                months: Number(event.target.value || 0),
                              })
                            }
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Price (GBP)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={version.price}
                            onChange={(event) =>
                              updateVersion(version.id, { price: event.target.value })
                            }
                            placeholder="199"
                          />
                        </div>
                      </div>

                      <div className="mt-4">
                        <div className="space-y-2">
                          <Label>Embedded link (optional)</Label>
                          <Input
                            value={version.embeddedLink}
                            onChange={(event) =>
                              updateVersion(version.id, { embeddedLink: event.target.value })
                            }
                            placeholder="https://buy.stripe.com/... or embedded checkout URL"
                          />
                        </div>
                      </div>

                      <div className="mt-4 grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Display duration label</Label>
                          <Input
                            value={version.durationLabel}
                            onChange={(event) =>
                              updateVersion(version.id, { durationLabel: event.target.value })
                            }
                            placeholder="3 Months"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Billing label</Label>
                          <Input
                            value={version.billingLabel}
                            onChange={(event) =>
                              updateVersion(version.id, { billingLabel: event.target.value })
                            }
                            placeholder="£66/month"
                          />
                          {monthlyLabelSuggestion ? (
                            <button
                              type="button"
                              onClick={() =>
                                updateVersion(version.id, {
                                  billingLabel: monthlyLabelSuggestion,
                                })
                              }
                              className="text-xs font-medium text-emerald-600 transition hover:text-emerald-700"
                            >
                              Use suggested label: {monthlyLabelSuggestion}
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex items-center gap-2 text-emerald-900">
                          <ArrowDownToLine className="h-4 w-4" />
                          <p className="text-sm font-semibold">Version preview</p>
                        </div>
                        <div className="mt-3 grid gap-2 text-sm text-emerald-900/80">
                          <p>Original price: {formatGbp(preview?.originalPrice || 0)}</p>
                          <p>
                            Discounted price: {formatGbp(preview?.discountedPrice || 0)}
                            {preview?.hasDiscount ? " applied" : ""}
                          </p>
                          <p>{form.marketingCouponId ? "Marketing coupon preview applied" : "No marketing coupon shown"}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-900">Plan active</p>
              <p className="text-xs text-slate-500">
                Keep this on if the plan should be visible for assignment or sale.
              </p>
            </div>
            <Switch
              checked={form.isActive}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-slate-900">
              <Crown className="h-4 w-4" />
              <p className="text-sm font-semibold">Plan summary</p>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-slate-700">
              <p>{totalScopedGroups} access scopes selected</p>
              <p>{totalSelected} content items selected</p>
              <p>{form.versions.length} duration version(s) configured</p>
              <p>AI Viva Minutes: {Number(form.vivaMinutes || 0)}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-900">
              <ArrowDownToLine className="h-4 w-4" />
              <p className="text-sm font-semibold">Version coverage</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-sm text-emerald-900/80">
              {form.versions
                .slice()
                .sort((a, b) => Number(a.months) - Number(b.months))
                .map((version) => (
                  <span
                    key={version.id}
                    className="rounded-full border border-emerald-200 bg-white px-3 py-1"
                  >
                    {version.months} months
                  </span>
                ))}
            </div>
          </div>
        </div>

        <Button onClick={onSave} disabled={saving} className="w-full">
          {saving ? "Saving..." : editingId ? "Update Plan" : "Create Plan"}
        </Button>
      </CardContent>
    </Card>
  );
}
