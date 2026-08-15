"use client";

import type { Dispatch, SetStateAction } from "react";
import { Gift, TicketPercent } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { EmptyState } from "@/components/dashboard/shared/EmptyState";
import { couponTypeOptions } from "@/components/dashboard/plan-creator/constants";
import type {
  CouponFormValues,
  PricingPlan,
  PricingCoupon,
} from "@/components/dashboard/plan-creator/types";

export function CouponLauncherCard({
  couponForm,
  setCouponForm,
  coupons,
  plans,
  savingCoupon,
  onCreateCoupon,
  onToggleCoupon,
  onDeleteCoupon,
}: {
  couponForm: CouponFormValues;
  setCouponForm: Dispatch<SetStateAction<CouponFormValues>>;
  coupons: PricingCoupon[];
  plans: PricingPlan[];
  savingCoupon: boolean;
  onCreateCoupon: () => void;
  onToggleCoupon: (coupon: PricingCoupon, nextValue: boolean) => void;
  onDeleteCoupon: (id: string) => void;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Create a secret plan coupon</h2>
            <p className="mt-1 text-sm text-slate-500">
              Create a private code and choose exactly which pricing plans can accept it.
            </p>
          </div>
          <Gift className="h-5 w-5 text-amber-500" />
        </div>

        <div className="space-y-3 rounded-2xl border border-teal-200 bg-teal-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <Label className="text-sm font-semibold text-teal-950">Allowed plans</Label>
              <p className="mt-1 text-xs text-teal-700">The code works only on the pricing plans selected here.</p>
            </div>
            <Badge className="bg-teal-600 text-white hover:bg-teal-600">
              {couponForm.allowedPlanIds.length} selected
            </Badge>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() =>
                setCouponForm((prev) => ({
                  ...prev,
                  allowedPlanIds: plans.map((plan) => plan.id),
                }))
              }
            >
              Select all
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setCouponForm((prev) => ({ ...prev, allowedPlanIds: [] }))}
            >
              Clear
            </Button>
          </div>

          <div className="grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
            {plans.map((plan) => {
              const selected = couponForm.allowedPlanIds.includes(plan.id);
              return (
                <label
                  key={plan.id}
                  className={`flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-3 text-sm transition ${
                    selected
                      ? "border-teal-600 bg-teal-600 text-white"
                      : "border-teal-200 bg-white text-slate-700 hover:border-teal-400"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onChange={() =>
                      setCouponForm((prev) => ({
                        ...prev,
                        allowedPlanIds: selected
                          ? prev.allowedPlanIds.filter((id) => id !== plan.id)
                          : [...prev.allowedPlanIds, plan.id],
                      }))
                    }
                    className="h-4 w-4"
                  />
                  <span className="truncate font-medium">{plan.name}</span>
                </label>
              );
            })}
          </div>

          {plans.length === 0 && (
            <p className="rounded-xl bg-white p-3 text-sm text-slate-500">No pricing plans are available yet.</p>
          )}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Coupon code</Label>
            <div className="flex gap-2">
              <Input
                value={couponForm.code}
                onChange={(event) =>
                  setCouponForm((prev) => ({
                    ...prev,
                    code: event.target.value.toUpperCase(),
                  }))
                }
                placeholder="MAYVIVA20"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() =>
                  setCouponForm((prev) => ({
                    ...prev,
                    code: `COURSE-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
                  }))
                }
              >
                Generate
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Discount type</Label>
            <div className="flex gap-2">
              {couponTypeOptions.map((option) => (
                <button
                  key={option.key}
                  type="button"
                  onClick={() =>
                    setCouponForm((prev) => ({
                      ...prev,
                      discountType: option.key,
                    }))
                  }
                  className={`rounded-full border px-3 py-2 text-sm ${
                    couponForm.discountType === option.key
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Discount value</Label>
            <Input
              type="number"
              min="1"
              value={couponForm.discountValue}
              onChange={(event) =>
                setCouponForm((prev) => ({ ...prev, discountValue: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={couponForm.description}
              onChange={(event) =>
                setCouponForm((prev) => ({ ...prev, description: event.target.value }))
              }
              placeholder="Launch offer for viva candidates"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Starts at</Label>
            <Input
              type="date"
              value={couponForm.startsAt}
              onChange={(event) =>
                setCouponForm((prev) => ({ ...prev, startsAt: event.target.value }))
              }
            />
          </div>

          <div className="space-y-2">
            <Label>Ends at</Label>
            <Input
              type="date"
              value={couponForm.endsAt}
              onChange={(event) =>
                setCouponForm((prev) => ({ ...prev, endsAt: event.target.value }))
              }
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div>
            <p className="text-sm font-medium text-slate-900">Secret coupon active</p>
            <p className="text-xs text-slate-500">Users must enter the private code; it is not advertised publicly.</p>
          </div>
          <Switch
            checked={couponForm.isActive}
            onCheckedChange={(checked) => setCouponForm((prev) => ({ ...prev, isActive: checked }))}
          />
        </div>

        <Button
          onClick={onCreateCoupon}
          disabled={savingCoupon || !couponForm.code.trim() || couponForm.allowedPlanIds.length === 0}
          className="w-full bg-teal-600 text-white hover:bg-teal-700"
        >
          {savingCoupon ? "Creating..." : "Create secret coupon"}
        </Button>

        <div className="space-y-3">
          {coupons.length === 0 ? (
            <EmptyState
              icon={TicketPercent}
              title="No coupons launched yet"
              description="Temporary pricing campaigns will show up here after the first coupon is created."
            />
          ) : (
            coupons.map((coupon) => (
              <div key={coupon.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-slate-900">{coupon.code}</p>
                      <Badge
                        className={
                          coupon.isActive
                            ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                            : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                        }
                      >
                        {coupon.isActive ? "Active" : "Inactive"}
                      </Badge>
                      {coupon.isSecret === true && (
                        <Badge variant="outline" className="border-violet-200 bg-violet-50 text-violet-700">
                          Secret
                        </Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {coupon.description || "No description added."}
                    </p>
                    <p className="mt-2 text-xs text-slate-500">
                      {coupon.discountType === "percent"
                        ? `${coupon.discountValue}% off`
                        : `\u00A3${coupon.discountValue} off`}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {(coupon.allowedPlanIds || []).length} allowed plan{(coupon.allowedPlanIds || []).length === 1 ? "" : "s"}
                    </p>
                  </div>
                  <Switch
                    checked={coupon.isActive}
                    onCheckedChange={(checked) => onToggleCoupon(coupon, checked)}
                  />
                </div>

                <div className="mt-4 flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                    onClick={() => onDeleteCoupon(coupon.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
