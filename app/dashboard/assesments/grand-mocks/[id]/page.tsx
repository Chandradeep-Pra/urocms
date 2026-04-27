"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  Clock,
  FileText,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface Question {
  id: string;
  questionText: string;
  options: string[];
  correctAnswer: string;
  explanation?: any;
}

interface QuizOption {
  id: string;
  title: string;
  type: string;
  durationMinutes: number;
}

interface MockAttempt {
  candidate: {
    name: string;
    email: string;
  };
  marks: number;
}

interface MockDetails {
  id: string;
  title: string;
  quizId: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  attempts: MockAttempt[];
  attemptsCount?: number;
  quiz: {
    id: string;
    title: string;
    type: string;
    durationMinutes?: number;
    questionIds?: string[];
    bankIds?: string[];
  };
  questions: Question[];
}

const toDateTimeLocal = (value?: string | null) => {
  if (!value) return "";
  const date = new Date(value);
  const timezoneOffset = date.getTimezoneOffset();
  const localDate = new Date(date.getTime() - timezoneOffset * 60 * 1000);
  return localDate.toISOString().slice(0, 16);
};

export default function GrandMockDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();

  const [mock, setMock] = useState<MockDetails | null>(null);
  const [quizzes, setQuizzes] = useState<QuizOption[]>([]);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    quizId: "",
    startTime: "",
    endTime: "",
    durationMinutes: "",
  });

  useEffect(() => {
    fetchMock();
    fetchQuizzes();
  }, []);

  const fetchMock = async () => {
    try {
      const res = await fetch(`/api/mocks/${id}`);
      const data = await res.json();
      const nextMock = data.mock;
      setMock(nextMock);
      setForm({
        quizId: nextMock.quizId,
        startTime: toDateTimeLocal(nextMock.startTime),
        endTime: toDateTimeLocal(nextMock.endTime),
        durationMinutes: String(nextMock.durationMinutes || ""),
      });
    } catch {
      toast.error("Failed to load mock");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      const res = await fetch("/api/quizzes");
      const data = await res.json();
      const filtered = (data.quizzes || []).filter(
        (quiz: QuizOption) => quiz.type === "mock" || quiz.type === "grand-mock"
      );
      setQuizzes(filtered);
    } catch {
      toast.error("Failed to load linked quizzes");
    }
  };

  const deriveStatus = () => {
    if (!mock) return "";
    const now = Date.now();
    const start = new Date(mock.startTime).getTime();
    const end = mock.endTime
      ? new Date(mock.endTime).getTime()
      : start + mock.durationMinutes * 60 * 1000;

    if (now < start) return "Scheduled";
    if (now <= end) return "Live";
    return "Completed";
  };

  const getExplanationText = (question: Question) => {
    if (!question.explanation) return "No explanation provided.";
    if (typeof question.explanation === "string") return question.explanation;
    if (typeof question.explanation?.text === "string") return question.explanation.text;
    return "No explanation provided.";
  };

  const getQuestionPreview = (text: string, maxLength = 96) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  const handleSave = async () => {
    if (!mock) return;

    setSaving(true);

    try {
      const payload = {
        quizId: form.quizId,
        startTime: form.startTime,
        endTime: form.endTime,
        durationMinutes: Number(form.durationMinutes),
      };

      const res = await fetch(`/api/mocks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error();

      toast.success("Mock updated");
      fetchMock();
    } catch {
      toast.error("Failed to update mock");
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-10">Loading...</div>;
  if (!mock) return <div className="p-10">Mock not found</div>;

  const status = deriveStatus();

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-white">
      <div className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-8 py-6">
          <div className="flex items-center gap-6">
            <button
              onClick={() => router.push("/dashboard/assesments/grand-mocks")}
              className="flex items-center gap-2 text-sm text-zinc-500 transition hover:text-zinc-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                {mock.title}
              </h1>

              <div className="mt-2 flex flex-wrap gap-6 text-xs text-zinc-500">
                <span className="flex items-center gap-2">
                  <CalendarDays className="h-3 w-3" />
                  {new Date(mock.startTime).toLocaleString()}
                </span>
                <span className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  {mock.durationMinutes} min
                </span>
                <span className="flex items-center gap-2">
                  <FileText className="h-3 w-3" />
                  {mock.questions?.length} questions
                </span>
                <span className="flex items-center gap-2">
                  <Users className="h-3 w-3" />
                  {mock.attempts.length} attempted
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div
              className={`rounded-full px-4 py-1 text-xs font-medium ${
                status === "Live"
                  ? "bg-emerald-100 text-emerald-700"
                  : status === "Scheduled"
                  ? "bg-indigo-100 text-indigo-700"
                  : "bg-zinc-200 text-zinc-700"
              }`}
            >
              {status}
            </div>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl space-y-8 px-8 py-10">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.95fr]">
          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-zinc-900">Mock Settings</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Edit schedule and linked quiz safely. Questions still come from the linked quiz and question bank setup.
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Linked Quiz</Label>
                <Select
                  value={form.quizId}
                  onValueChange={(value) => {
                    const selected = quizzes.find((quiz) => quiz.id === value);
                    setForm((prev) => ({
                      ...prev,
                      quizId: value,
                      durationMinutes:
                        selected?.durationMinutes?.toString() || prev.durationMinutes,
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose quiz" />
                  </SelectTrigger>
                  <SelectContent>
                    {quizzes.map((quiz) => (
                      <SelectItem key={quiz.id} value={quiz.id}>
                        {quiz.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      durationMinutes: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      startTime: e.target.value,
                    }))
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>End Time</Label>
                <Input
                  type="datetime-local"
                  value={form.endTime}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      endTime: e.target.value,
                    }))
                  }
                />
              </div>
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <SummaryCard
                icon={FileText}
                title="Quiz Source"
                value={mock.quiz.title}
                meta={mock.quiz.type}
              />
              <SummaryCard
                icon={Users}
                title="Attempts"
                value={String(mock.attempts.length)}
                meta="candidate records"
              />
              <SummaryCard
                icon={Trophy}
                title="Question Pool"
                value={String(mock.questions.length)}
                meta="derived from linked quiz"
              />
            </div>
          </section>

          <section className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="mb-5">
              <h2 className="text-lg font-semibold text-zinc-900">Attempts</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Attempt records should come from the real student submission flow. This page shows the submitted candidates and marks.
              </p>
            </div>

            <div className="mt-6 space-y-3">
              {mock.attempts.length > 0 ? (
                mock.attempts.map((attempt, index) => (
                  <div
                    key={`${attempt.candidate.email}-${index}`}
                    className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:flex-row md:items-center md:justify-between"
                  >
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-zinc-900">
                        {attempt.candidate.name || "Unnamed candidate"}
                      </p>
                      <p className="text-sm text-zinc-500">{attempt.candidate.email}</p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-zinc-900">
                        {attempt.marks} marks
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-300 bg-zinc-50 p-5 text-sm text-zinc-500">
                  No attempts added yet.
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-zinc-200 bg-zinc-50/70 px-6 py-5">
            <h2 className="text-lg font-semibold text-zinc-900">Questions</h2>
            <p className="mt-1 text-sm text-zinc-500">
              These are derived from the linked quiz. Editing the schedule or attempts here does not directly alter question bank content.
            </p>
          </div>

          <Table className="min-w-[860px]">
            <TableHeader>
              <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                <TableHead className="w-[72px] px-4">#</TableHead>
                <TableHead className="px-4">Question</TableHead>
                <TableHead className="w-[130px]">Options</TableHead>
                <TableHead className="w-[220px]">Correct Answer</TableHead>
                <TableHead className="w-[140px]">Explanation</TableHead>
                <TableHead className="w-[120px] pr-4 text-right">Action</TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {mock.questions?.map((question, index) => {
                const isExpanded = expandedQuestionId === question.id;

                return (
                  <Fragment key={question.id}>
                    <TableRow className="hover:bg-zinc-50/80">
                      <TableCell className="px-4 font-medium text-zinc-700">
                        {index + 1}
                      </TableCell>

                      <TableCell className="whitespace-normal px-4 leading-relaxed text-zinc-800">
                        {getQuestionPreview(question.questionText)}
                      </TableCell>

                      <TableCell className="text-zinc-600">
                        {question.options?.length ?? 0}
                      </TableCell>

                      <TableCell className="whitespace-normal text-zinc-700">
                        {question.correctAnswer}
                      </TableCell>

                      <TableCell>
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                            getExplanationText(question) !== "No explanation provided."
                              ? "bg-emerald-100 text-emerald-700"
                              : "bg-zinc-100 text-zinc-600"
                          }`}
                        >
                          {getExplanationText(question) !== "No explanation provided."
                            ? "Available"
                            : "Missing"}
                        </span>
                      </TableCell>

                      <TableCell className="pr-4 text-right">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedQuestionId(isExpanded ? null : question.id)
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 transition hover:bg-zinc-100"
                        >
                          {isExpanded ? "Collapse" : "Expand"}
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${
                              isExpanded ? "rotate-180" : "rotate-0"
                            }`}
                          />
                        </button>
                      </TableCell>
                    </TableRow>

                    {isExpanded && (
                      <TableRow className="bg-zinc-50/80 hover:bg-zinc-50/80">
                        <TableCell colSpan={6} className="p-0">
                          <div className="border-t border-zinc-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.7),rgba(244,244,245,0.95))] px-6 py-6">
                            <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
                              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                                  Full Question
                                </h3>
                                <p className="text-sm leading-relaxed text-zinc-700">
                                  {question.questionText}
                                </p>
                              </div>

                              <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                                  Explanation
                                </h3>
                                <p className="text-sm leading-relaxed text-zinc-700">
                                  {getExplanationText(question)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
                              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-500">
                                Options
                              </h3>

                              <div className="grid gap-3 md:grid-cols-2">
                                {question.options?.map((option, optionIndex) => {
                                  const isCorrect = option === question.correctAnswer;

                                  return (
                                    <div
                                      key={optionIndex}
                                      className={`flex items-start gap-3 rounded-xl border p-3 ${
                                        isCorrect
                                          ? "border-emerald-300 bg-emerald-50"
                                          : "border-zinc-200 bg-white"
                                      }`}
                                    >
                                      <div
                                        className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                                          isCorrect
                                            ? "bg-emerald-500 text-white"
                                            : "bg-zinc-100 text-zinc-700"
                                        }`}
                                      >
                                        {String.fromCharCode(65 + optionIndex)}
                                      </div>

                                      <p className="flex-1 whitespace-normal text-sm text-zinc-700">
                                        {option}
                                      </p>

                                      {isCorrect && (
                                        <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

function SummaryCard({
  icon: Icon,
  title,
  value,
  meta,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  meta: string;
}) {
  return (
    <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-zinc-700 shadow-sm">
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{title}</p>
          <p className="text-lg font-semibold text-zinc-900">{value}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-zinc-500">{meta}</p>
    </div>
  );
}
