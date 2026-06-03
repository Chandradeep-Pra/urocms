"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  Clock,
  FileText,
  Lock,
  Sparkles,
} from "lucide-react";

type MockQuestion = {
  id: string;
  questionText: string;
  options?: string[];
  correctAnswer?: string;
};

type MockPayload = {
  id: string;
  title: string;
  accessType?: "public" | "restricted";
  startTime: string | null;
  endTime: string | null;
  durationMinutes: number;
  quiz?: {
    title?: string;
    type?: string;
  };
  questions?: MockQuestion[];
};

type AccessPayload = {
  allowed: boolean;
  mode: "public" | "full" | "preview" | "locked";
  reason?: string | null;
  isPublic?: boolean;
};

function formatDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function getStatus(mock: MockPayload | null) {
  if (!mock?.startTime) return "Scheduled";
  const now = Date.now();
  const start = new Date(mock.startTime).getTime();
  const end = mock.endTime
    ? new Date(mock.endTime).getTime()
    : start + Number(mock.durationMinutes || 0) * 60 * 1000;

  if (Number.isNaN(start)) return "Scheduled";
  if (now < start) return "Scheduled";
  if (now >= start && now <= end) return "Live";
  return "Completed";
}

export default function PublicGrandMockPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [mock, setMock] = useState<MockPayload | null>(null);
  const [access, setAccess] = useState<AccessPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadMock() {
      try {
        setLoading(true);
        setError("");

        const res = await fetch(`/api/app/mocks/${id}`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => null);

        if (!active) return;

        if (!res.ok) {
          setError(data?.error || "This mock is not available right now.");
          setMock(null);
          setAccess(null);
          return;
        }

        setMock(data?.mock ?? null);
        setAccess(data?.access ?? null);
      } catch {
        if (!active) return;
        setError("Failed to load this mock.");
        setMock(null);
        setAccess(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    loadMock();

    return () => {
      active = false;
    };
  }, [id]);

  const status = useMemo(() => getStatus(mock), [mock]);
  const isPublic = access?.isPublic || mock?.accessType === "public";

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(15,120,150,0.12),_transparent_34%),linear-gradient(180deg,_#f8fbfc_0%,_#ffffff_42%,_#ecfeff_100%)] text-[#071014]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-full border border-[#0f7896]/12 bg-white px-4 py-2 text-sm font-semibold text-[#0f7896] shadow-sm transition hover:bg-cyan-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>

          <div
            className={`rounded-full px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
              isPublic
                ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                : "border border-zinc-200 bg-zinc-50 text-zinc-600"
            }`}
          >
            {isPublic ? "Open access" : "Members only"}
          </div>
        </div>

        {loading ? (
          <div className="rounded-[32px] border border-[#0f7896]/12 bg-white p-8 shadow-[0_24px_70px_rgba(15,120,150,0.12)]">
            <p className="text-sm text-[#071014]/60">Loading mock...</p>
          </div>
        ) : error ? (
          <div className="rounded-[32px] border border-zinc-200 bg-white p-8 shadow-[0_24px_70px_rgba(15,120,150,0.08)]">
            <div className="flex items-start gap-4">
              <div className="rounded-2xl bg-zinc-100 p-3 text-zinc-600">
                <Lock className="h-5 w-5" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold tracking-tight text-zinc-900">
                  Access restricted
                </h1>
                <p className="max-w-2xl text-sm leading-6 text-zinc-600">{error}</p>
              </div>
            </div>
          </div>
        ) : mock ? (
          <div className="space-y-6">
            <section className="overflow-hidden rounded-[32px] border border-[#0f7896]/12 bg-white shadow-[0_24px_70px_rgba(15,120,150,0.12)]">
              <div className="border-b border-[#0f7896]/10 bg-[linear-gradient(135deg,rgba(15,120,150,0.08),rgba(18,148,186,0.02))] px-6 py-6 sm:px-8">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-3">
                    <div className="inline-flex items-center gap-2 rounded-full border border-[#0f7896]/12 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7896]">
                      <Sparkles className="h-3.5 w-3.5" />
                      Grand Mock
                    </div>
                    <div className="space-y-2">
                      <h1 className="text-3xl font-extrabold tracking-tight text-[#071014] sm:text-4xl">
                        {mock.title}
                      </h1>
                      <p className="max-w-3xl text-sm leading-7 text-[#071014]/62">
                        {isPublic
                          ? "This mock is available to anyone without signing in."
                          : "This mock is currently restricted to members."}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3 text-sm text-[#071014]/70">
                    <InfoPill icon={CalendarDays} label={formatDateTime(mock.startTime)} />
                    <InfoPill
                      icon={Clock}
                      label={
                        mock.endTime
                          ? formatDateTime(mock.endTime)
                          : `${mock.durationMinutes || 0} min`
                      }
                    />
                    <InfoPill icon={FileText} label={`${mock.questions?.length || 0} questions`} />
                    <InfoPill icon={Lock} label={status} />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 px-6 py-6 sm:px-8 lg:grid-cols-[0.95fr_1.05fr]">
                <div className="rounded-3xl border border-[#0f7896]/10 bg-cyan-50/60 p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0f7896]/70">
                    Quiz
                  </p>
                  <h2 className="mt-2 text-xl font-bold text-[#071014]">
                    {mock.quiz?.title || "Untitled quiz"}
                  </h2>
                  <p className="mt-2 text-sm leading-6 text-[#071014]/60">
                    Type: {mock.quiz?.type || "mock"}
                  </p>
                  <p className="mt-4 text-sm leading-6 text-[#071014]/60">
                    Use this page as the public entry point when access is set to allow anyone.
                  </p>
                </div>

                <div className="rounded-3xl border border-zinc-200 bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                    Access
                  </p>
                  <div className="mt-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-lg font-bold text-zinc-900">
                        {isPublic ? "Available to everyone" : "Members only"}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-zinc-600">
                        {isPublic
                          ? "Visitors can open this mock without authentication."
                          : "This mock keeps the current authenticated access flow."}
                      </p>
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] ${
                        isPublic
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-zinc-100 text-zinc-600"
                      }`}
                    >
                      {isPublic ? "Public" : "Restricted"}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[32px] border border-[#0f7896]/12 bg-white p-6 shadow-[0_24px_70px_rgba(15,120,150,0.08)] sm:p-8">
              <div className="mb-6">
                <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#0f7896]/70">
                  Questions
                </p>
                <h2 className="mt-2 text-2xl font-bold tracking-tight text-[#071014]">
                  {mock.questions?.length || 0} questions loaded
                </h2>
              </div>

              <div className="grid gap-4">
                {mock.questions?.length ? (
                  mock.questions.map((question, index) => (
                    <article
                      key={question.id}
                      className="rounded-3xl border border-zinc-200 bg-zinc-50/70 p-5"
                    >
                      <div className="flex items-start gap-4">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#0f7896] text-sm font-bold text-white">
                          {index + 1}
                        </div>
                        <div className="min-w-0 flex-1 space-y-4">
                          <p className="text-base leading-7 text-zinc-900">
                            {question.questionText}
                          </p>

                          {question.options?.length ? (
                            <div className="grid gap-3 md:grid-cols-2">
                              {question.options.map((option, optionIndex) => (
                                <div
                                  key={`${question.id}-${optionIndex}`}
                                  className="rounded-2xl border border-white bg-white px-4 py-3 text-sm text-zinc-700 shadow-sm"
                                >
                                  <span className="mr-2 font-semibold text-zinc-500">
                                    {String.fromCharCode(65 + optionIndex)}.
                                  </span>
                                  {option}
                                </div>
                              ))}
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </article>
                  ))
                ) : (
                  <div className="rounded-3xl border border-dashed border-zinc-300 bg-zinc-50 p-8 text-sm text-zinc-500">
                    No questions are attached to this mock yet.
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : null}
      </div>
    </main>
  );
}

function InfoPill({
  icon: Icon,
  label,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-[#0f7896]/12 bg-white px-4 py-2 shadow-sm">
      <Icon className="h-4 w-4 text-[#0f7896]" />
      <span className="whitespace-nowrap text-xs font-semibold uppercase tracking-[0.12em] text-[#071014]/70">
        {label}
      </span>
    </div>
  );
}
