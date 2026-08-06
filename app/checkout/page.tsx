"use client";

import { Suspense, useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { ArrowRight, Loader2, ShieldCheck } from "lucide-react";
import { auth } from "@/lib/firebaseClient";
import { Button } from "@/components/ui/button";

type CheckoutDetails = {
  plan: { id: string; name: string; description: string };
  version: {
    id: string;
    months: number;
    durationLabel: string;
    currency: string;
    price: number;
  };
  checkoutUrl: string;
};

function CheckoutContent() {
  const [details, setDetails] = useState<CheckoutDetails | null>(null);
  const [error, setError] = useState("");

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
        setDetails(data);
      } catch (checkoutError) {
        setError(checkoutError instanceof Error ? checkoutError.message : "Unable to open checkout");
      }
    });
    return unsubscribe;
  }, []);

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
        <p className="mt-2 text-3xl font-bold text-slate-950">
          {new Intl.NumberFormat("en-GB", {
            style: "currency",
            currency: details.version.currency,
          }).format(details.version.price)}
        </p>
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
