"use client";

import { Clock3, Inbox } from "lucide-react";
import type { PricingPlanWaitlistResponse } from "@/components/dashboard/plan-creator/types";

function formatDate(value?: string | null) {
  if (!value) {
    return "Just now";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Just now";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function WaitlistResponsesPanel({
  responses,
}: {
  responses: PricingPlanWaitlistResponse[];
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 bg-slate-50 px-6 py-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Waitlist responses
          </p>
          <h2 className="mt-1 text-2xl font-semibold tracking-[-0.04em] text-slate-950">
            Coming soon plan interest
          </h2>
        </div>
        <span className="rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white">
          {responses.length} response{responses.length === 1 ? "" : "s"}
        </span>
      </div>

      {responses.length === 0 ? (
        <div className="flex items-center gap-3 px-6 py-6 text-sm text-slate-500">
          <Inbox className="h-5 w-5" />
          No waitlist responses yet.
        </div>
      ) : (
        <div className="max-h-80 overflow-y-auto">
          <div className="min-w-full divide-y divide-slate-100">
            {responses.map((response) => (
              <div
                key={response.id}
                className="grid gap-4 px-6 py-4 text-sm md:grid-cols-[1.1fr_1.1fr_1fr_1fr]"
              >
                <div>
                  <p className="font-semibold text-slate-950">{response.name}</p>
                  <p className="mt-1 text-slate-500">{response.email}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Plan
                  </p>
                  <p className="mt-1 font-medium text-slate-800">{response.planName}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                    Institution
                  </p>
                  <p className="mt-1 text-slate-700">{response.institution}</p>
                </div>
                <div className="flex items-start gap-2 text-slate-500">
                  <Clock3 className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{formatDate(response.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
