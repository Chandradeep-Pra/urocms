"use client";

import { Suspense, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, CircleHelp, Loader2, ReceiptText, ShieldCheck, Tag } from "lucide-react";
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
    expiresAt: string | null;
  }>;
  checkoutUrl: string;
  taxPercent: number;
};

type AppliedPricing = {
  couponCode: string;
  discountAmount: number;
  discountedPrice: number;
  expiresAt: string | null;
};

function formatRemainingTime(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(totalSeconds / 86_400);
  const hours = Math.floor((totalSeconds % 86_400) / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  const time = [hours, minutes, seconds]
    .map((part) => String(part).padStart(2, "0"))
    .join(":");

  return days > 0 ? `${days}d ${time}` : time;
}

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
    expiresAt:
      details.coupons.find(
        (coupon) => coupon.code.toUpperCase() === String(data.coupon?.code || couponCode).toUpperCase(),
      )?.expiresAt ?? null,
  } satisfies AppliedPricing;
}

function CheckoutContent() {
  const [details, setDetails] = useState<CheckoutDetails | null>(null);
  const [error, setError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [couponError, setCouponError] = useState("");
  const [appliedPricing, setAppliedPricing] = useState<AppliedPricing | null>(null);
  const [verifyingCoupon, setVerifyingCoupon] = useState(false);
  const [countdownNow, setCountdownNow] = useState(Date.now());

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
        const requestedCouponCode = params.get("couponCode")?.trim().toUpperCase();
        const selectedCoupon = checkoutDetails.coupons.find(
          (coupon) => requestedCouponCode && coupon.code.toUpperCase() === requestedCouponCode,
        );
        if (selectedCoupon) {
          setCouponCode(selectedCoupon.code);
          try {
            setAppliedPricing(await verifyCoupon(checkoutDetails, selectedCoupon.code));
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

  useEffect(() => {
    if (!appliedPricing?.expiresAt) return;
    const expiresAt = new Date(appliedPricing.expiresAt).getTime();
    const interval = window.setInterval(() => {
      const now = Date.now();
      setCountdownNow(now);
      if (now >= expiresAt) {
        setAppliedPricing(null);
        setCouponError("This coupon has expired");
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [appliedPricing?.expiresAt]);

  async function applySelectedCoupon(nextCode = couponCode) {
    if (!details || !nextCode.trim()) return;
    try {
      setVerifyingCoupon(true);
      setCouponError("");
      const normalizedCode = nextCode.trim().toUpperCase();
      setCouponCode(normalizedCode);
      setAppliedPricing(await verifyCoupon(details, normalizedCode));
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
  const subtotal = appliedPricing?.discountedPrice ?? details.version.originalPrice;
  const taxAmount = Math.round(subtotal * details.taxPercent) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  const queryId = new URLSearchParams(window.location.search).get("queryId");
  const countdownMs = appliedPricing?.expiresAt
    ? Math.max(0, new Date(appliedPricing.expiresAt).getTime() - countdownNow)
    : null;
  const countdownLabel = countdownMs === null
    ? null
    : formatRemainingTime(countdownMs);
  const expiryDateLabel = appliedPricing?.expiresAt
    ? new Intl.DateTimeFormat("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        timeZoneName: "short",
      }).format(new Date(appliedPricing.expiresAt))
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 text-emerald-700">
        <ShieldCheck className="h-6 w-6" />
        <span className="font-semibold">Signed in and ready for secure checkout</span>
      </div>
      {queryId ? (
        <div className="flex items-start gap-3 rounded-lg border border-cyan-200 bg-cyan-50 p-4 text-cyan-900">
          <CircleHelp className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="font-semibold">Your payment query is linked</p>
            <p className="mt-1 text-sm text-cyan-800">Support reference: {queryId}</p>
          </div>
        </div>
      ) : null}
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
              <motion.button
                key={coupon.id}
                type="button"
                onClick={() => void applySelectedCoupon(coupon.code)}
                disabled={verifyingCoupon}
                layout
                whileHover={{ y: -2, scale: 1.01 }}
                whileTap={{ scale: 0.98 }}
                animate={{
                  boxShadow:
                    couponCode === coupon.code
                      ? "0 10px 30px rgba(8, 145, 178, 0.14)"
                      : "0 0 0 rgba(0, 0, 0, 0)",
                }}
                transition={{ type: "spring", stiffness: 380, damping: 28 }}
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
              </motion.button>
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
          <Button type="button" variant="outline" onClick={() => void applySelectedCoupon()} disabled={!couponCode.trim() || verifyingCoupon}>
            {verifyingCoupon ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}
          </Button>
        </div>
        <AnimatePresence mode="wait" initial={false}>
          {appliedPricing ? (
            <motion.div
              key={`applied-${appliedPricing.couponCode}`}
              initial={{ opacity: 0, y: 8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.98 }}
              transition={{ duration: 0.24, ease: "easeOut" }}
              className="flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-emerald-700"
            >
              <p className="flex items-center gap-2">
                <Check className="h-4 w-4" /> Coupon {appliedPricing.couponCode} applied
              </p>
              {expiryDateLabel ? (
                <p className="rounded-full bg-emerald-100 px-3 py-1 text-xs">
                  Offer ends on {expiryDateLabel}
                </p>
              ) : null}
            </motion.div>
          ) : couponError ? (
            <motion.p
              key="coupon-error"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="text-sm text-rose-600"
            >
              {couponError}
            </motion.p>
          ) : null}
        </AnimatePresence>
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
          <AnimatePresence initial={false}>
          {appliedPricing ? (
            <motion.div
              key={appliedPricing.couponCode}
              initial={{ opacity: 0, height: 0, y: -5 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -5 }}
              transition={{ duration: 0.25 }}
              className="flex justify-between overflow-hidden text-emerald-700"
            >
              <span>Coupon discount ({appliedPricing.couponCode})</span>
              <span>−{money(appliedPricing.discountAmount)}</span>
            </motion.div>
          ) : null}
          </AnimatePresence>
          <div className="flex justify-between gap-4 text-slate-500">
            <span>Taxes + platform fee ({details.taxPercent}%)</span>
            <span>+{money(taxAmount)}</span>
          </div>
          <div className="border-t border-slate-200 pt-3">
            <div className="flex items-end justify-between gap-4">
              <span className="font-semibold text-slate-950">Total</span>
              <div className="text-right">
                <AnimatePresence initial={false}>
                  {appliedPricing ? (
                    <motion.p
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      className="text-sm text-slate-400 line-through"
                    >
                      {money(details.version.originalPrice)}
                    </motion.p>
                  ) : null}
                </AnimatePresence>
                <AnimatePresence mode="popLayout" initial={false}>
                  <motion.span
                    key={total}
                    initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
                    animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                    exit={{ opacity: 0, y: -8, filter: "blur(4px)" }}
                    transition={{ type: "spring", stiffness: 360, damping: 27 }}
                    className="block text-2xl font-bold text-slate-950"
                  >
                    {money(total)}
                  </motion.span>
                </AnimatePresence>
                {countdownLabel ? (
                  <p className="mt-1 font-mono text-xs font-semibold text-rose-600">
                    {countdownLabel} remaining
                  </p>
                ) : null}
              </div>
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
