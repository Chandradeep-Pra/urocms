"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ImageUp,
  Mail,
  Sparkles,
  Users,
} from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/client/adminApi";

interface QuizState {
  question: string;
  image: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface LiveQuiz {
  id?: string;
  question: string;
  image?: string;
  options?: string[];
  correctIndex?: number;
  explanation?: string;
  createdAt?: { _seconds: number } | string | Date;
  submissions?: number;
  source?: string;
}

interface QuizAttempt {
  uid: string;
  email: string;
  selectedIndex: number | null;
  correct: boolean;
  createdAt?: { _seconds: number } | string | Date | null;
}

type TabKey = "creator" | "insights";

const EMPTY_QUIZ: QuizState = {
  question: "",
  image: "",
  options: ["", "", "", "", ""],
  correctIndex: 0,
  explanation: "",
};

function formatQuizDate(value?: { _seconds: number } | string | Date) {
  if (!value) return "Unknown date";

  const date =
    typeof value === "object" && "_seconds" in value
      ? new Date(value._seconds * 1000)
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown date";

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function DailyQuizManager() {
  const [activeTab, setActiveTab] = useState<TabKey>("creator");
  const [quiz, setQuiz] = useState<QuizState>(EMPTY_QUIZ);
  const [live, setLive] = useState<LiveQuiz | null>(null);
  const [history, setHistory] = useState<LiveQuiz[]>([]);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<LiveQuiz | null>(null);
  const [selectedAttempts, setSelectedAttempts] = useState<QuizAttempt[]>([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [aiTopic, setAiTopic] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [publishing, setPublishing] = useState(false);

  const update = <K extends keyof QuizState>(field: K, value: QuizState[K]) =>
    setQuiz((prev) => ({ ...prev, [field]: value }));

  const updateOption = (value: string, index: number) => {
    const updated = [...quiz.options];
    updated[index] = value;
    update("options", updated);
  };

  const isValid =
    quiz.question.trim() &&
    quiz.options.every((option) => option.trim() !== "") &&
    quiz.explanation.trim();

  const groupedHistory = useMemo(() => {
    const groups = new Map<string, LiveQuiz[]>();

    history.forEach((item) => {
      const label = (() => {
        const rawDate = item.id || formatQuizDate(item.createdAt);
        if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) {
          const date = new Date(`${rawDate}T00:00:00`);
          return date.toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          });
        }
        return "Older";
      })();

      groups.set(label, [...(groups.get(label) || []), item]);
    });

    return Array.from(groups.entries()).map(([label, quizzes]) => ({
      label,
      quizzes,
    }));
  }, [history]);

  const fetchLive = async () => {
    try {
      const res = await fetch("/api/daily-quiz", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch live quiz");
      setLive(data.quiz ?? null);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch live quiz");
    }
  };

  const fetchHistory = async () => {
    try {
      const res = await adminFetch("/api/daily-quiz/history", {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch quiz history");
      setHistory(data.quizzes || []);
    } catch (error: any) {
      toast.error(error.message || "Failed to fetch quiz history");
    }
  };

  useEffect(() => {
    fetchLive();
    fetchHistory();
  }, []);

  useEffect(() => {
    if (!selectedQuizId) return;

    let cancelled = false;

    async function fetchDetail() {
      try {
        setLoadingDetail(true);
        const res = await adminFetch(`/api/daily-quiz/${selectedQuizId}`);
        const data = await res.json();

        if (!res.ok) throw new Error(data?.error || "Failed to fetch quiz detail");

        if (!cancelled) {
          setSelectedQuiz(data.quiz || null);
          setSelectedAttempts(data.attempts || []);
        }
      } catch (error: any) {
        if (!cancelled) {
          toast.error(error.message || "Failed to load quiz detail");
        }
      } finally {
        if (!cancelled) {
          setLoadingDetail(false);
        }
      }
    }

    fetchDetail();

    return () => {
      cancelled = true;
    };
  }, [selectedQuizId]);

  async function handleImageUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "daily_quiz");

    const toastId = toast.loading("Uploading image...");

    try {
      const res = await fetch("/api/cloudinary-upload", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        throw new Error(`Upload failed (${res.status})`);
      }

      const data = await res.json();
      update("image", data.url);

      toast.success("Image uploaded successfully", {
        id: toastId,
        description: "Preview updated instantly.",
      });
    } catch (error: any) {
      toast.error("Image upload failed", {
        id: toastId,
        description: error.message || "Please try again.",
      });
    } finally {
      event.target.value = "";
    }
  }

  async function generateAI() {
    if (!aiTopic.trim()) {
      toast.warning("Please enter a topic first");
      return;
    }

    try {
      setLoadingAI(true);

      const loadingToast = toast.loading("Generating AI question...");

      const res = await adminFetch("/api/daily-quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();
      setQuiz(data.quiz);

      toast.dismiss(loadingToast);
      toast.success("AI Question Generated", {
        description: "You can edit before publishing.",
      });
    } catch {
      toast.error("AI generation failed");
    } finally {
      setLoadingAI(false);
    }
  }

  async function publishQuiz() {
    if (!isValid) {
      toast.warning("Please complete all fields");
      return;
    }

    try {
      setPublishing(true);

      const loadingToast = toast.loading("Publishing quiz...");

      const res = await adminFetch("/api/daily-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quiz),
      });

      if (!res.ok) throw new Error();

      toast.dismiss(loadingToast);
      toast.success("Quiz Published Successfully", {
        description: "Today's quiz is now live.",
      });

      setQuiz(EMPTY_QUIZ);
      setAiTopic("");
      await Promise.all([fetchLive(), fetchHistory()]);
      setActiveTab("insights");
    } catch {
      toast.error("Failed to publish quiz");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="rounded-3xl border bg-gradient-to-br from-white to-slate-50 p-8 shadow-xl">
      <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-800">Daily Quiz Manager</h2>
          <p className="text-sm text-slate-500">
            Create daily quizzes and inspect published quiz performance.
          </p>
        </div>

        <div className="inline-flex rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
          {[
            { key: "creator", label: "Quiz Creator" },
            { key: "insights", label: "Quiz Insights" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key as TabKey)}
              className={`rounded-xl px-4 py-2 text-sm font-medium transition ${
                activeTab === tab.key
                  ? "bg-slate-900 text-white"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "creator" ? (
        <div className="flex flex-col gap-8 xl:flex-row">
          <div className="xl:w-1/4 space-y-5">
            <div className="rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-md">
              <div className="mb-4 flex items-center justify-between">
                <span className="text-sm font-semibold">Live Today</span>

                <span
                  className={`rounded-full px-3 py-1 text-xs ${
                    live ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  {live ? "LIVE" : "NOT LIVE"}
                </span>
              </div>

              {live ? (
                <>
                  <p className="line-clamp-4 text-sm text-slate-700">{live.question}</p>

                  <div className="mt-4 flex items-center justify-between text-xs text-slate-500">
                    <div className="flex items-center gap-1">
                      <CalendarDays className="h-4 w-4" />
                      <span>{formatQuizDate(live.createdAt)}</span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {live.submissions ?? 0}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-sm text-slate-400">No quiz published today.</p>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-6">
            <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white shadow-lg">
              <div className="mb-3 flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                <span className="font-semibold">Generate with AI</span>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <input
                  placeholder="Enter topic (e.g. Renal Cell Carcinoma)"
                  className="flex-1 rounded-xl px-4 py-2 text-black"
                  value={aiTopic}
                  onChange={(e) => setAiTopic(e.target.value)}
                />
                <button
                  onClick={generateAI}
                  disabled={loadingAI}
                  className="rounded-xl bg-white px-5 py-2 font-semibold text-purple-700 transition hover:scale-105"
                >
                  {loadingAI ? "Generating..." : "Generate"}
                </button>
              </div>
            </div>

            <textarea
              placeholder="Enter question..."
              className="w-full rounded-2xl border p-4 text-sm"
              value={quiz.question}
              onChange={(e) => update("question", e.target.value)}
            />

            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Image URL"
                className="flex-1 rounded-2xl border px-4 py-3 text-sm"
                value={quiz.image}
                onChange={(e) => update("image", e.target.value)}
              />

              <label className="cursor-pointer rounded-2xl bg-black p-3 text-white transition hover:bg-slate-800">
                <ImageUp className="h-5 w-5" />
                <input type="file" accept="image/*" hidden onChange={handleImageUpload} />
              </label>
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {quiz.options.map((option, index) => (
                <div key={index} className="flex items-center gap-3">
                  <input
                    type="radio"
                    checked={quiz.correctIndex === index}
                    onChange={() => update("correctIndex", index)}
                  />
                  <input
                    className="flex-1 rounded-xl border p-2 text-sm"
                    placeholder={`Option ${index + 1}`}
                    value={option}
                    onChange={(e) => updateOption(e.target.value, index)}
                  />
                </div>
              ))}
            </div>

            <textarea
              placeholder="Enter explanation..."
              className="w-full rounded-2xl border p-4 text-sm"
              value={quiz.explanation}
              onChange={(e) => update("explanation", e.target.value)}
            />

            <button
              onClick={publishQuiz}
              disabled={!isValid || publishing}
              className={`w-full rounded-2xl py-3 font-semibold transition ${
                isValid
                  ? "bg-black text-white hover:bg-slate-800"
                  : "cursor-not-allowed bg-slate-200 text-slate-400"
              }`}
            >
              {publishing ? "Publishing..." : "Publish Quiz"}
            </button>
          </div>

          <div className="w-full xl:w-1/3">
            <div className="aspect-square overflow-hidden rounded-3xl border bg-slate-100 shadow-lg md:aspect-video xl:aspect-square">
              {quiz.image ? (
                <img src={quiz.image} alt="preview" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-slate-400">
                  Image Preview
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border bg-white p-6 shadow-sm">
          {!selectedQuizId ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Posted Quizzes</h3>
                <p className="text-xs text-slate-500">
                  All quizzes from Firebase, shown in reverse date order.
                </p>
              </div>

              <div className="space-y-5">
                {groupedHistory.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
                    No quizzes found yet. Publish a daily quiz and it will appear here.
                  </div>
                ) : (
                  groupedHistory.map((group) => (
                  <div key={group.label} className="space-y-2">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      {group.label}
                    </p>
                    <div className="space-y-3">
                      {group.quizzes.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setSelectedQuizId(item.id || null)}
                          className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-left transition hover:bg-slate-100"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-2">
                              <p className="text-xs font-medium text-slate-500">
                                {item.id || formatQuizDate(item.createdAt)}
                              </p>
                              <p className="line-clamp-2 text-sm font-semibold text-slate-900">
                                {item.question}
                              </p>
                              <div className="flex flex-wrap gap-2">
                                <span className="rounded-full bg-white px-3 py-1 text-[11px] text-slate-500 shadow-sm">
                                  {item.submissions ?? 0} attempts
                                </span>
                                <span className="rounded-full bg-white px-3 py-1 text-[11px] text-slate-500 shadow-sm">
                                  {formatQuizDate(item.createdAt)}
                                </span>
                              </div>
                            </div>
                            <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" />
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                  ))
                )}
              </div>
            </div>
          ) : loadingDetail ? (
            <div className="flex min-h-[420px] items-center justify-center text-sm text-slate-500">
              Loading quiz details...
            </div>
          ) : selectedQuiz ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => {
                  setSelectedQuizId(null);
                  setSelectedQuiz(null);
                  setSelectedAttempts([]);
                }}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to all quizzes
              </button>

              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    {selectedQuiz.id || formatQuizDate(selectedQuiz.createdAt)}
                  </p>
                  <h3 className="text-xl font-semibold text-slate-900">
                    {selectedQuiz.question}
                  </h3>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600">
                    {selectedQuiz.submissions ?? selectedAttempts.length} attempts
                  </span>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs text-emerald-700">
                    {formatQuizDate(selectedQuiz.createdAt)}
                  </span>
                </div>
              </div>

              <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
                <div className="space-y-5">
                  {selectedQuiz.image ? (
                    <div className="overflow-hidden rounded-2xl border">
                      <img
                        src={selectedQuiz.image}
                        alt="Quiz media"
                        className="h-full max-h-[280px] w-full object-cover"
                      />
                    </div>
                  ) : null}

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-sm font-semibold text-slate-900">Options</p>
                    <div className="mt-4 space-y-3">
                      {(selectedQuiz.options || []).map((option, index) => (
                        <div
                          key={`${selectedQuiz.id}-option-${index}`}
                          className={`rounded-xl border px-4 py-3 text-sm ${
                            selectedQuiz.correctIndex === index
                              ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                              : "border-slate-200 bg-white text-slate-700"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <span className="font-semibold">{String.fromCharCode(65 + index)}.</span>
                            <span className="flex-1">{option}</span>
                            {selectedQuiz.correctIndex === index ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-white p-4">
                    <p className="text-sm font-semibold text-slate-900">Explanation</p>
                    <p className="mt-3 text-sm leading-7 text-slate-600">
                      {selectedQuiz.explanation || "No explanation stored for this quiz."}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-slate-900">Attempted Email IDs</p>
                    <span className="rounded-full bg-white px-2.5 py-1 text-[11px] text-slate-500 shadow-sm">
                      {selectedAttempts.length}
                    </span>
                  </div>

                  <div className="mt-4 space-y-2">
                    {selectedAttempts.length === 0 ? (
                      <p className="text-sm text-slate-500">No attempts recorded yet.</p>
                    ) : (
                      selectedAttempts.map((attempt, index) => (
                        <div
                          key={`${attempt.uid}-${index}`}
                          className="rounded-xl border border-slate-200 bg-white px-3 py-3"
                        >
                          <div className="flex items-start gap-3">
                            <Mail className="mt-0.5 h-4 w-4 text-slate-400" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-800">
                                {attempt.email || attempt.uid}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {attempt.selectedIndex !== null
                                  ? `Selected option ${String.fromCharCode(65 + attempt.selectedIndex)}`
                                  : "Selection unavailable"}
                              </p>
                            </div>
                            <span
                              className={`rounded-full px-2.5 py-1 text-[11px] ${
                                attempt.correct
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {attempt.correct ? "Correct" : "Wrong"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex min-h-[420px] items-center justify-center text-center text-sm text-slate-500">
              Select a posted quiz to view the question, options, and attempts.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
