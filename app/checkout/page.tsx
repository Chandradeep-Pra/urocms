"use client";

import { Suspense, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowRight, Check, Loader2, ReceiptText, ShieldCheck, Tag } from "lucide-react";
import { auth } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type CheckoutDetails = {
  plan: { id: string; name: string; description: string };
  version: {
    id: string;
    months: number;
    durationLabel: string;
    currency: string;
    originalPrice: number;
  };
  coupons: Array<{
    id: string;
    code: string;
    description: string;
    discountType: "percent" | "amount";
    discountValue: number;
    isMarketing: boolean;
  }>;
  checkoutUrl: string;
};

type AppliedPricing = {
  couponCode: string;
  discountAmount: number;
  discountedPrice: number;
};

async function verifyCoupon(details: CheckoutDetails, couponCode: string) {
  const response = await fetch("/api/verify-coupon-web", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      planId: details.plan.id,
      versionId: details.version.id,
      couponCode,
    }),
  });
  const data = await response.json();
  if (!response.ok || !data.applied) {
    throw new Error(data.error || "Coupon cannot be applied");
  }
  return {
    couponCode: String(data.coupon?.code || couponCode),
    discountAmount: Number(data.pricing?.discountAmount || 0),
    discountedPrice: Number(data.pricing?.discountedPrice ?? details.version.originalPrice),
  } satisfies AppliedPricing;
}

function CheckoutContent() {
  const [details, setDetails] = useState<CheckoutDetails | null>(null);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [appliedPricing, setAppliedPricing] = useState<AppliedPricing | null>(null);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        const redirect = window.location.href;
        window.location.assign(`/login?redirect=${encodeURIComponent(redirect)}`);
        return;
      }

      try {
        const params = new URLSearchParams(window.location.search);
        const token = await user.getIdToken();
        const response = await fetch(
          `/api/app/checkout?planId=${encodeURIComponent(params.get("planId") || "")}&versionId=${encodeURIComponent(params.get("versionId") || "")}`,
          { headers: { Authorization: `Bearer ${token}` }, cache: "no-store" },
        );
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to open checkout");
        const checkoutDetails = data as CheckoutDetails;
        setDetails(checkoutDetails);
        const marketingCoupon = checkoutDetails.coupons.find((coupon) => coupon.isMarketing);
        if (marketingCoupon) {
          setCouponCode(marketingCoupon.code);
          try {
            setAppliedPricing(await verifyCoupon(checkoutDetails, marketingCoupon.code));
          } catch {
            // Keep checkout available if an advertised coupon has just expired or changed.
          }
        }
      } catch (checkoutError) {
        setError(checkoutError instanceof Error ? checkoutError.message : "Unable to open checkout");
      }
    });
    return unsubscribe;
  }, []);

  async function applySelectedCoupon() {
    if (!details || !couponCode.trim()) return;
    try {
      setVerifyingCoupon(true);
      setCouponError("");
      setAppliedPricing(await verifyCoupon(details, couponCode.trim().toUpperCase()));
    } catch (couponApplyError) {
      setAppliedPricing(null);
      setCouponError(
        couponApplyError instanceof Error ? couponApplyError.message : "Coupon cannot be applied",
      );
    } finally {
      setVerifyingCoupon(false);
    }
  }

  if (error) {
    return <p className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-700">{error}</p>;
  }
  if (!details) {
    return (
      <div className="flex items-center justify-center gap-3 py-16 text-slate-600">
        <Loader2 className="h-5 w-5 animate-spin" />
        Checking your account and course...
      </div>
    );
  }

  const money = (value: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: details.version.currency,
    }).format(value);
  const total = appliedPricing?.discountedPrice ?? details.version.originalPrice;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-emerald-700">
        <ShieldCheck className="h-6 w-6" />
        <span className="font-semibold">Signed in and ready for secure checkout</span>
      </div>
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">Course checkout</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-950">{details.plan.name}</h1>
        {details.plan.description ? <p className="mt-3 text-slate-600">{details.plan.description}</p> : null}
      </div>
      <div className="rounded-2xl bg-slate-50 p-5">
        <p className="font-medium text-slate-900">
          {details.version.durationLabel || `${details.version.months} months`}
        </p>
        <p className="mt-2 text-sm text-slate-500">One-time course plan purchase</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Tag className="h-5 w-5 text-cyan-700" />
          <h2 className="font-semibold text-slate-950">Available coupons</h2>
        </div>
        {details.coupons.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {details.coupons.map((coupon) => (
              <button
                key={coupon.id}
                type="button"
                onClick={() => {
                  setCouponCode(coupon.code);
                  setAppliedPricing(null);
                  setCouponError("");
                }}
                className={`rounded-2xl border p-3 text-left transition ${
                  couponCode === coupon.code
                    ? "border-cyan-600 bg-cyan-50"
                    : "border-slate-200 hover:border-cyan-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="font-bold text-slate-950">{coupon.code}</span>
                  {coupon.isMarketing ? (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">Featured</span>
                  ) : null}
                </div>
                <p className="mt-1 text-sm font-medium text-cyan-800">
                  {coupon.discountType === "percent"
                    ? `${coupon.discountValue}% off`
                    : `${money(coupon.discountValue)} off`}
                </p>
                {coupon.description ? <p className="mt-1 text-xs text-slate-500">{coupon.description}</p> : null}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No coupons are currently available for this plan.</p>
        )}
        <div className="flex gap-2">
          <Input
            value={couponCode}
            onChange={(event) => {
              setCouponCode(event.target.value.toUpperCase());
              setAppliedPricing(null);
              setCouponError("");
            }}
            placeholder="Enter coupon code"
          />
          <Button type="button" variant="outline" onClick={applySelectedCoupon} disabled={!couponCode.trim() || verifyingCoupon}>
            {verifyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </div>
        {appliedPricing ? (
          <p className="flex items-center gap-2 text-sm font-medium text-emerald-700">
            <Check className="h-4 w-4" /> Coupon {appliedPricing.couponCode} applied
          </p>
        ) : null}
        {couponError ? <p className="text-sm text-rose-600">{couponError}</p> : null}
      </div>

      <div className="rounded-2xl border border-slate-200 p-5">
        <div className="mb-4 flex items-center gap-2">
          <ReceiptText className="h-5 w-5 text-cyan-700" />
          <h2 className="font-semibold text-slate-950">Bill details</h2>
        </div>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between gap-4 text-slate-600">
            <span>{details.plan.name} · {details.version.durationLabel || `${details.version.months} months`}</span>
            <span>{money(details.version.originalPrice)}</span>
          </div>
          {appliedPricing ? (
            <div className="flex justify-between text-emerald-700">
              <span>Coupon discount ({appliedPricing.couponCode})</span>
              <span>−{money(appliedPricing.discountAmount)}</span>
            </div>
          ) : null}
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-end justify-between gap-4">
              <span className="font-semibold text-slate-950">Total</span>
              <span className="text-2xl font-bold text-slate-950">{money(total)}</span>
            </div>
            <p className="mt-1 text-right text-xs text-slate-500">Currency: {details.version.currency}</p>
          </div>
        </div>
      </div>
      <Button asChild className="w-full rounded-full py-6 text-base">
        <a href={details.checkoutUrl} rel="noopener noreferrer">
          Continue to payment <ArrowRight className="ml-2 h-4 w-4" />
        </a>
      </Button>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 to-white px-4 py-16">
      <div className="mx-auto max-w-xl rounded-[30px] border border-cyan-900/10 bg-white p-7 shadow-xl sm:p-10">
        <Suspense fallback={<p className="py-16 text-center text-slate-500">Loading checkout...</p>}>
          <CheckoutContent />
        </Suspense>
      </div>
    </main>
  );
}
