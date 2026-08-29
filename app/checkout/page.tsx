"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { AnimatePresence, motion } from "framer-motion";
import { Check, CircleHelp, Loader2, ReceiptText, ShieldCheck, Tag } from "lucide-react";
import { auth } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type AvailableCheckoutDetails = {
  purchaseAvailable: true;
  plan: { id: string; courseId: string; name: string; description: string };
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
  paypalClientId: string;
  user: { uid: string; email: string | null; name: string | null };
};

type UnavailableCheckoutDetails = {
  purchaseAvailable: false;
  message: string;
  plan: { id: string; name: string; description: string };
  user: { uid: string; email: string | null; name: string | null };
};

type CheckoutDetails = AvailableCheckoutDetails | UnavailableCheckoutDetails;

type PayPalButtons = (options: {
  fundingSource?: string;
  style?: { layout?: "vertical" | "horizontal"; shape?: "pill" | "rect"; label?: "paypal" | "checkout" | "pay" | "buynow"; height?: number };
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onCancel: () => void;
  onError: (error: unknown) => void;
}) => { render: (selector: HTMLElement) => Promise<void>; close?: () => Promise<void> };

declare global { interface Window { paypal?: { Buttons: PayPalButtons; FUNDING?: { PAYPAL?: string } } } }

function PurchaseSuccess() {
  const colors = ["#0f7896", "#1294ba", "#f59e0b", "#10b981", "#ec4899"];
  return <div className="relative overflow-hidden py-8 text-center">{Array.from({ length: 36 }, (_, index) => <span key={index} className="pointer-events-none absolute top-[-20px] h-3 w-2 animate-[confetti-fall_3s_ease-in_infinite]" style={{ left: `${(index * 29) % 100}%`, backgroundColor: colors[index % colors.length], animationDelay: `${(index % 12) * 0.16}s`, animationDuration: `${2.4 + (index % 7) * 0.2}s`, transform: `rotate(${index * 37}deg)` }} />)}<div className="relative mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-emerald-700"><Check className="h-10 w-10" /></div><p className="relative mt-6 text-sm font-bold uppercase tracking-[0.18em] text-[#0f7896]">Payment confirmed</p><h1 className="relative mt-3 text-4xl font-black tracking-[-0.05em] text-slate-950">Thank you for your purchase!</h1><p className="relative mx-auto mt-4 max-w-md text-base leading-7 text-slate-600">Your payment was verified successfully and your course access is now active.</p><a href="https://urologics.co.uk" className="relative mt-8 inline-flex min-h-12 items-center justify-center rounded-full bg-[#0f7896] px-8 font-bold text-white shadow-lg transition hover:bg-[#0b647d]">Login to Urologics</a><p className="relative mt-4 text-xs text-slate-500">A purchase confirmation has been sent to your email.</p><style jsx>{`@keyframes confetti-fall { 0% { transform: translateY(-20px) rotate(0deg); opacity: 1; } 100% { transform: translateY(620px) rotate(720deg); opacity: 0; } }`}</style></div>;
}

type AppliedPricing = {
  couponCode: string;
  discountAmount: number;
  discountedPrice: number;
  expiresAt: string | null;
};

async function verifyCoupon(details: AvailableCheckoutDetails, couponCode: string) {
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
  const [paymentState, setPaymentState] = useState<"idle" | "loading" | "processing" | "success" | "cancelled" | "failed" | "pending">("idle");
  const [paymentError, setPaymentError] = useState("");
  const [materialRequest, setMaterialRequest] = useState("");
  const [requestSaving, setRequestSaving] = useState(false);
  const [requestSubmitted, setRequestSubmitted] = useState(false);
  const [requestError, setRequestError] = useState("");
  const [concernOpen, setConcernOpen] = useState(false);
  const [paymentQuery, setPaymentQuery] = useState("");
  const [concernSaving, setConcernSaving] = useState(false);
  const [concernError, setConcernError] = useState("");
  const [concernReference, setConcernReference] = useState("");
  const [concernEmailSent, setConcernEmailSent] = useState(false);
  const paymentComplete = paymentState === "success";

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
        if (!checkoutDetails.purchaseAvailable) return;
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
      if (now >= expiresAt) {
        setAppliedPricing(null);
        setCouponError("This coupon has expired");
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [appliedPricing?.expiresAt]);

  useEffect(() => {
    if (!details?.purchaseAvailable || !details.paypalClientId || paymentComplete) return;
    const availableDetails = details;
    let disposed = false;
    let buttons: ReturnType<PayPalButtons> | null = null;
    const container = document.getElementById("paypal-button-container");
    if (!container) return;
    container.innerHTML = "";
    const render = async () => {
      if (disposed || !window.paypal || !container) return;
      buttons = window.paypal.Buttons({
        style: { layout: "vertical", shape: "pill", label: "paypal", height: 48 },
        createOrder: async () => {
          setPaymentState("loading"); setPaymentError("");
          const user = auth.currentUser; if (!user) throw new Error("Please sign in again");
          const response = await fetch("/api/paypal/create-order", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ courseId: availableDetails.plan.courseId, planId: availableDetails.plan.id, versionId: availableDetails.version.id, couponCode: appliedPricing?.couponCode || undefined }) });
          const data = await response.json(); if (!response.ok) throw new Error(data.error || "Unable to create payment");
          setPaymentState("idle"); return String(data.orderId);
        },
        onApprove: async ({ orderID }) => {
          setPaymentState("processing"); setPaymentError("");
          try {
            const user = auth.currentUser; if (!user) throw new Error("Please sign in again");
            const response = await fetch("/api/paypal/capture-order", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` }, body: JSON.stringify({ orderId: orderID }) });
            const data = await response.json();
            if (!response.ok) { setPaymentState(data.pending ? "pending" : "failed"); throw new Error(data.error || "Payment verification failed"); }
            setPaymentState("success");
          } catch (error) { setPaymentError(error instanceof Error ? error.message : "Payment verification failed"); setPaymentState((state) => state === "pending" ? state : "failed"); }
        },
        onCancel: () => { setPaymentState("cancelled"); setPaymentError("Payment was cancelled. You have not been charged."); },
        onError: (error) => { console.error("PayPal checkout error", error); setPaymentState("failed"); setPaymentError("PayPal checkout failed. Please retry this order before starting another payment."); },
      });
      await buttons.render(container);
    };
    const existing = document.querySelector<HTMLScriptElement>("script[data-paypal-sdk]");
    if (existing) { if (window.paypal) void render(); else existing.addEventListener("load", render, { once: true }); }
    else {
      const script = document.createElement("script"); script.dataset.paypalSdk = "true";
      script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(availableDetails.paypalClientId)}&currency=${encodeURIComponent(availableDetails.version.currency)}&intent=capture`;
      script.addEventListener("load", render, { once: true }); script.addEventListener("error", () => { setPaymentState("failed"); setPaymentError("Unable to load PayPal checkout"); }); document.head.appendChild(script);
    }
    return () => { disposed = true; void buttons?.close?.(); };
  }, [details, appliedPricing?.couponCode, paymentComplete]);

  async function applySelectedCoupon(nextCode = couponCode) {
    if (!details?.purchaseAvailable || !nextCode.trim()) return;
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
        Continuing to checkout...
      </div>
    );
  }

  if (!details.purchaseAvailable) {
    const submitMaterialRequest = async (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      try {
        setRequestSaving(true);
        setRequestError("");
        const user = auth.currentUser;
        if (!user) throw new Error("Please sign in again");
        const response = await fetch("/api/pricing-plans/waitlist", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${await user.getIdToken()}` },
          body: JSON.stringify({ requestType: "course-material", planId: details.plan.id, requestedCourseMaterial: materialRequest }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to submit your request");
        setRequestSubmitted(true);
      } catch (requestSubmitError) {
        setRequestError(requestSubmitError instanceof Error ? requestSubmitError.message : "Unable to submit your request");
      } finally {
        setRequestSaving(false);
      }
    };

    return (
      <div className="space-y-6">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-cyan-700">Plan availability</p>
          <h1 className="mt-2 text-3xl font-bold text-slate-950">{details.plan.name}</h1>
          <p className="mt-3 text-slate-600">Purchase for this plan isn&apos;t available right now.</p>
        </div>
        {requestSubmitted ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-emerald-800">
            <p className="font-semibold">Your request has been received</p>
            <p className="mt-2 text-sm leading-6">We sent a confirmation to {details.user.email}. We will contact you when suitable course material becomes available.</p>
          </div>
        ) : (
          <form onSubmit={submitMaterialRequest} className="space-y-4 rounded-2xl border border-cyan-900/10 bg-cyan-50/40 p-5">
            <p className="text-sm leading-6 text-slate-600">Please fill out this request and tell us what course material you need.</p>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Name</label>
              <Input value={details.user.name || "Member"} readOnly className="bg-white" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">Email</label>
              <Input value={details.user.email || ""} readOnly className="bg-white" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-900">What course material do you need?</label>
              <Textarea required minLength={10} value={materialRequest} onChange={(event) => setMaterialRequest(event.target.value)} placeholder="Tell us the topics, videos, question banks, mock exams, or other material you are looking for..." className="min-h-32 bg-white" />
            </div>
            {requestError ? <p className="text-sm font-medium text-rose-600">{requestError}</p> : null}
            <Button type="submit" disabled={requestSaving || materialRequest.trim().length < 10} className="w-full rounded-full py-6">
              {requestSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending request...</> : "Join priority list"}
            </Button>
          </form>
        )}
      </div>
    );
  }

  if (paymentComplete) return <PurchaseSuccess />;

  const money = (value: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: details.version.currency,
    }).format(value);
  const wholeMoney = (value: number) =>
    new Intl.NumberFormat("en-GB", {
      style: "currency",
      currency: details.version.currency,
      maximumFractionDigits: 0,
    }).format(value);
  const subtotal = appliedPricing?.discountedPrice ?? details.version.originalPrice;
  const taxAmount = Math.round(subtotal * details.taxPercent) / 100;
  const total = Math.round((subtotal + taxAmount) * 100) / 100;
  const queryId = new URLSearchParams(window.location.search).get("queryId");
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
  const canRaiseConcern = paymentState === "failed" || paymentState === "cancelled" || paymentState === "pending";

  const submitPaymentConcern = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    try {
      setConcernSaving(true);
      setConcernError("");
      const response = await fetch("/api/payment-queries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: details.user.name || "Member",
          email: details.user.email || "",
          query: paymentQuery,
          planId: details.plan.id,
          versionId: details.version.id,
          couponCode: appliedPricing?.couponCode || couponCode.trim(),
          platform: "web",
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to raise your concern");
      setConcernReference(String(data.queryId || ""));
      setConcernEmailSent(data.emailSent === true);
    } catch (concernSubmitError) {
      setConcernError(concernSubmitError instanceof Error ? concernSubmitError.message : "Unable to raise your concern");
    } finally {
      setConcernSaving(false);
    }
  };

  return (
    <div className={`relative space-y-6 ${paymentState === "loading" ? "min-h-40 [&>*:not(.payment-loading)]:invisible" : ""}`}>
      {paymentState === "loading" ? (
        <div className="payment-loading absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-cyan-50 text-cyan-700 ring-1 ring-cyan-100">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
          <p className="text-sm font-semibold text-slate-700">Proceeding to checkout...</p>
        </div>
      ) : null}
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
            <span>Taxes + platform fee</span>
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
                    {wholeMoney(total)}
                  </motion.span>
                </AnimatePresence>
                
              </div>
            </div>
            <p className="mt-1 text-right text-xs text-slate-500">Currency: {details.version.currency}</p>
          </div>
        </div>
      </div>
      {paymentState === "processing" ? <div className="flex items-center gap-2 rounded-2xl bg-cyan-50 p-4 text-cyan-800"><Loader2 className="h-4 w-4 animate-spin" /> Processing and verifying payment...</div> : null}
      {paymentState === "pending" ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-800">Payment verification is pending. Retry the same PayPal order; do not create another charge.</div> : null}
      {paymentError ? <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-rose-700">{paymentError}</div> : null}
      {canRaiseConcern ? (
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          {!concernOpen ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div><p className="font-semibold text-slate-950">Need help with this payment?</p><p className="mt-1 text-sm text-slate-600">Send the payment details to our support team.</p></div>
              <Button type="button" variant="outline" onClick={() => setConcernOpen(true)} className="rounded-full">Raise concern</Button>
            </div>
          ) : concernReference ? (
            <div className="text-emerald-800"><p className="font-semibold">Your payment concern has been raised</p><p className="mt-2 text-sm">Reference: {concernReference}. {concernEmailSent ? `A confirmation email was sent to ${details.user.email}.` : "Your concern was saved successfully."}</p></div>
          ) : (
            <form onSubmit={submitPaymentConcern} className="space-y-4">
              <div><p className="font-semibold text-slate-950">Raise a payment concern</p><p className="mt-1 text-sm text-slate-600">Your account and selected plan details are filled automatically.</p></div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1"><label className="text-sm font-medium text-slate-800">Name</label><Input value={details.user.name || "Member"} readOnly className="bg-white" /></div>
                <div className="space-y-1"><label className="text-sm font-medium text-slate-800">Email</label><Input value={details.user.email || ""} readOnly className="bg-white" /></div>
              </div>
              <div className="rounded-xl bg-white p-3 text-sm text-slate-600"><p><strong>Plan:</strong> {details.plan.name}</p><p><strong>Duration:</strong> {details.version.durationLabel || `${details.version.months} months`}</p><p><strong>Coupon:</strong> {appliedPricing?.couponCode || couponCode.trim() || "Not provided"}</p></div>
              <div className="space-y-1"><label className="text-sm font-medium text-slate-800">Describe the payment problem</label><Textarea required maxLength={2000} value={paymentQuery} onChange={(event) => setPaymentQuery(event.target.value)} placeholder="Tell us what happened during payment..." className="min-h-28 bg-white" /></div>
              {concernError ? <p className="text-sm font-medium text-rose-600">{concernError}</p> : null}
              <div className="flex gap-2"><Button type="submit" disabled={concernSaving || !paymentQuery.trim()} className="rounded-full">{concernSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Sending...</> : "Submit concern"}</Button><Button type="button" variant="ghost" onClick={() => setConcernOpen(false)} disabled={concernSaving}>Cancel</Button></div>
            </form>
          )}
        </div>
      ) : null}
      {!details.paypalClientId ? <p className="rounded-2xl bg-amber-50 p-4 text-amber-800">PayPal Sandbox is not configured.</p> : <div id="paypal-button-container" className={paymentState === "processing" ? "pointer-events-none opacity-50" : ""} />}
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
