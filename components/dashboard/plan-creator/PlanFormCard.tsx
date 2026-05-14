"use client";

import type { Dispatch, SetStateAction } from "react";
import { ArrowDownToLine, Crown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { expiryPresets, featureSuggestions, planPatterns, vivaMinutePresets } from "@/components/dashboard/plan-creator/constants";
import type { PlanFormValues, PricingCoupon } from "@/components/dashboard/plan-creator/types";

export function PlanFormCard({
  editingId,
  form,
  setForm,
  coupons,
  monthlyLabelSuggestion,
  pricingPreview,
  totalScopedGroups,
  totalSelected,
  saving,
  onApplyPattern,
  onSave,
}: {
  editingId: string | null;
  form: PlanFormValues;
  setForm: Dispatch<SetStateAction<PlanFormValues>>;
  coupons: PricingCoupon[];
  monthlyLabelSuggestion: string;
  pricingPreview: {
    originalPrice: number;
    discountedPrice: number;
    hasDiscount: boolean;
  };
  totalScopedGroups: number;
  totalSelected: number;
  saving: boolean;
  onApplyPattern: (key: (typeof planPatterns)[number]["key"]) => void;
  onSave: () => void;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="space-y-6 p-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">
              {editingId ? "Edit plan" : "Create plan"}
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Configure price, duration, display labels, and the exact unlock package.
            </p>
          </div>
          {editingId ? (
            <Badge variant="outline" className="border-slate-200 text-slate-600">
              Editing
            </Badge>
          ) : null}
        </div>

        <div className="space-y-5">
          {/* <div className="space-y-3">
            <Label>Plan pattern</Label>
            <div className="grid gap-3 sm:grid-cols-2">
              {planPatterns.map((pattern) => {
                const Icon = pattern.icon;
                return (
                  <button
                    key={pattern.key}
                    type="button"
                    onClick={() => onApplyPattern(pattern.key)}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
                  >
                    <div className="flex items-start gap-3">
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm">
                        <Icon className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-slate-900">{pattern.title}</p>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          {pattern.description}
                        </p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div> */}

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

          <div className="grid gap-4 sm:grid-cols-2">
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
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-price">Price (GBP)</Label>
              <Input
                id="plan-price"
                type="number"
                min="0"
                value={form.price}
                onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                placeholder="799"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-coupon">Coupon (optional)</Label>
              <select
                id="plan-coupon"
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm outline-none focus:ring-2 focus:ring-slate-900"
                value={form.couponId}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, couponId: event.target.value }))
                }
              >
                <option value="">No coupon</option>
                {coupons.map((coupon) => (
                  <option key={coupon.id} value={coupon.id}>
                    {coupon.code} ·{" "}
                    {coupon.discountType === "percent"
                      ? `${coupon.discountValue}% off`
                      : `£${coupon.discountValue} off`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-expiry">Expiry (months)</Label>
              <Input
                id="plan-expiry"
                type="number"
                min="0"
                value={form.expiryMonths}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    expiryMonths: Number(event.target.value || 0),
                  }))
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-embedded-link">Embedded link (optional)</Label>
              <Input
                id="plan-embedded-link"
                value={form.embeddedLink}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, embeddedLink: event.target.value }))
                }
                placeholder="https://buy.stripe.com/... or embedded checkout URL"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Quick expiry presets</Label>
            <div className="flex flex-wrap gap-2">
              {expiryPresets.map((months) => (
                <button
                  key={months}
                  type="button"
                  onClick={() => setForm((prev) => ({ ...prev, expiryMonths: months }))}
                  className={`rounded-full border px-3 py-1.5 text-sm transition ${
                    form.expiryMonths === months
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                  }`}
                >
                  {months} month{months > 1 ? "s" : ""}
                </button>
              ))}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="plan-duration-label">Display duration label</Label>
              <Input
                id="plan-duration-label"
                value={form.durationLabel}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, durationLabel: event.target.value }))
                }
                placeholder="6 Months / 2 Mocks / 16 Sessions"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plan-billing-label">Billing label</Label>
              <Input
                id="plan-billing-label"
                value={form.billingLabel}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, billingLabel: event.target.value }))
                }
                placeholder="\u00A3130/month"
              />
              {monthlyLabelSuggestion ? (
                <button
                  type="button"
                  onClick={() =>
                    setForm((prev) => ({ ...prev, billingLabel: monthlyLabelSuggestion }))
                  }
                  className="text-xs font-medium text-emerald-600 transition hover:text-emerald-700"
                >
                  Use suggested label: {monthlyLabelSuggestion}
                </button>
              ) : null}
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
              <Label htmlFor="plan-sort-order">Sort order</Label>
              <Input
                id="plan-sort-order"
                type="number"
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
            {/* <div className="flex flex-wrap gap-2">
              {featureSuggestions.map((feature) => (
                <button
                  key={feature}
                  type="button"
                  onClick={() =>
                    setForm((prev) => {
                      const existing = prev.featureBulletsText
                        .split("\n")
                        .map((item) => item.trim())
                        .filter(Boolean);

                      if (existing.includes(feature)) {
                        return prev;
                      }

                      return {
                        ...prev,
                        featureBulletsText: [...existing, feature].join("\n"),
                      };
                    })
                  }
                  className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-white"
                >
                  + {feature}
                </button>
              ))}
            </div> */}
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
              <p>
                Duration:{" "}
                {form.durationLabel ||
                  `${form.expiryMonths} month${form.expiryMonths > 1 ? "s" : ""}`}
              </p>
              <p>AI Viva Minutes: {Number(form.vivaMinutes || 0)}</p>
              {form.billingLabel ? <p>Billing: {form.billingLabel}</p> : null}
              {form.embeddedLink ? (
                <p className="break-all text-xs text-slate-500">{form.embeddedLink}</p>
              ) : null}
            </div>
          </div>

          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="flex items-center gap-2 text-emerald-900">
              <ArrowDownToLine className="h-4 w-4" />
              <p className="text-sm font-semibold">Pricing preview</p>
            </div>
            <div className="mt-3 grid gap-2 text-sm text-emerald-900/80">
              <p>Original price: £{pricingPreview.originalPrice || 0}</p>
              <p>
                Discounted price: £{pricingPreview.discountedPrice || 0}
                {pricingPreview.hasDiscount ? " applied" : ""}
              </p>
              <p>{form.couponId ? "Coupon attached to this plan" : "No coupon attached"}</p>
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
