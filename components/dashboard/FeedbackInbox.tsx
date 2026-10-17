"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageSquareText, RefreshCw, Star } from "lucide-react";
import { adminFetch } from "@/lib/client/adminApi";
import type { FeedbackInboxResponse, FeedbackInboxItem, FeedbackFilter } from "@/lib/experienceFeedback";

function FeedbackCard({ item }: { item: FeedbackInboxItem }) {
  const date = new Date(item.submittedAt);
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-primary">{item.categoryLabel} · {item.platform === "mobile" ? "Mobile app" : "Web"}</p>
          <h2 className="mt-2 break-words font-semibold text-slate-900">{item.contextTitle || "Overall app experience"}</h2>
          <p className="mt-1 break-words text-sm text-slate-500">{item.candidate.name || "Anonymous"}{item.candidate.email ? ` · ${item.candidate.email}` : ""}</p>
        </div>
        <time dateTime={item.submittedAt} className="text-xs text-slate-500">{Number.isNaN(date.getTime()) ? "Date unavailable" : new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date)}</time>
      </div>
      <div className="mt-5 flex flex-wrap gap-x-10 gap-y-4">
        {item.ratings.map(rating => (
          <div key={rating.key}>
            <p className="text-xs font-medium text-slate-500">{rating.label}</p>
            <div className="mt-1.5 flex items-center gap-1" aria-label={`${rating.label}: ${rating.value} out of 5 stars`}>
              {[1, 2, 3, 4, 5].map(value => <Star key={value} aria-hidden="true" size={17} className={value <= rating.value ? "fill-amber-400 text-amber-500" : "text-slate-200"} />)}
              <span className="ml-2 text-sm font-semibold text-slate-700">{rating.value}/5</span>
            </div>
          </div>
        ))}
      </div>
      {(item.reason || item.comment) && <div className="mt-5 space-y-3 rounded-xl bg-slate-50 p-4 text-sm leading-6 text-slate-700">
        {item.reason && <div><p className="text-xs font-semibold text-slate-500">Reason for the question rating</p><p className="mt-1 whitespace-pre-wrap break-words">{item.reason}</p></div>}
        {item.comment && <p className="whitespace-pre-wrap break-words">{item.comment}</p>}
      </div>}
    </article>
  );
}

export default function FeedbackInbox() {
  const [filters, setFilters] = useState<FeedbackFilter[]>([]);
  const [category, setCategory] = useState("all");
  const [items, setItems] = useState<FeedbackInboxItem[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const requestVersion = useRef(0);
  const invalidateRequests = useCallback(() => { requestVersion.current++; }, []);

  const load = useCallback(async (next: string | null = null) => {
    const version = ++requestVersion.current;
    setError("");
    if (next) setLoadingMore(true); else setLoading(true);
    try {
      const params = new URLSearchParams({ category });
      if (next) params.set("cursor", next);
      const response = await adminFetch(`/api/experience-feedback?${params}`, { cache: "no-store" });
      const data = await response.json() as FeedbackInboxResponse & { error?: string };
      if (!response.ok) throw new Error(data.error || "Unable to load feedback.");
      if (version !== requestVersion.current) return;
      setFilters(data.filters);
      setItems(previous => next ? [...previous, ...data.items] : data.items);
      setCursor(data.nextCursor);
    } catch (error) {
      if (version === requestVersion.current) setError(error instanceof Error ? error.message : "Unable to load feedback.");
    } finally {
      if (version === requestVersion.current) { setLoading(false); setLoadingMore(false); }
    }
  }, [category]);

  useEffect(() => {
    setItems([]); setCursor(null);
    void load();
    return invalidateRequests;
  }, [load, invalidateRequests]);

  return (
    <div className="mx-auto max-w-6xl space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="rounded-2xl bg-primary/10 p-3 text-primary"><MessageSquareText size={24} /></span>
          <div><h1 className="text-2xl font-semibold text-slate-900">Feedbacks</h1><p className="mt-1 text-sm text-slate-500">Candidate ratings and reviews across mocks, AI viva, web, and mobile.</p></div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || loadingMore} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 disabled:opacity-50"><RefreshCw size={15} />Refresh</button>
      </header>
      {filters.length > 0 && <nav aria-label="Feedback categories" className="flex flex-wrap gap-2">
        {filters.map(filter => <button key={filter.key} type="button" aria-pressed={category === filter.key} onClick={() => setCategory(filter.key)} className={`inline-flex items-center gap-2 rounded-full border px-4 py-2.5 text-sm font-medium transition ${category === filter.key ? "border-primary bg-primary text-white" : "border-slate-200 bg-white text-slate-600 hover:border-primary/40 hover:text-primary"}`}>
          {filter.label}<span className={`rounded-full px-2 py-0.5 text-xs tabular-nums ${category === filter.key ? "bg-white/20" : "bg-slate-100"}`}>{filter.count}</span>
        </button>)}
      </nav>}
      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">{error} <button type="button" className="ml-2 font-semibold underline" onClick={() => void load(cursor && items.length ? cursor : null)}>Try again</button></div>}
      {loading ? <div role="status" className="flex items-center justify-center gap-3 rounded-2xl border border-slate-200 bg-white py-20 text-sm text-slate-500"><Loader2 className="animate-spin" size={20} />Loading feedback…</div>
        : items.length ? <div className="space-y-4">{items.map(item => <FeedbackCard key={`${item.category}-${item.id}`} item={item} />)}</div>
          : !error && <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-20 text-center"><MessageSquareText className="mx-auto text-slate-300" size={36} /><h2 className="mt-4 font-semibold text-slate-800">No feedback yet</h2><p className="mt-2 text-sm text-slate-500">New responses will appear here when candidates share them.</p></div>}
      {!loading && cursor && <div className="text-center"><button type="button" disabled={loadingMore} onClick={() => void load(cursor)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{loadingMore && <Loader2 size={16} className="animate-spin" />}{loadingMore ? "Loading…" : "Load more feedback"}</button></div>}
    </div>
  );
}
