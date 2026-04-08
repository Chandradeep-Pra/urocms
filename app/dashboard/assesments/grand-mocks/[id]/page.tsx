"use client";

import { Fragment, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  FileText,
  CheckCircle2,
  ArrowLeft,
  ChevronDown,
} from "lucide-react";
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

interface MockDetails {
  id: string;
  title: string;
  quizId: string;
  startTime: string;
  durationMinutes: number;
  questions: Question[];
}

export default function GrandMockDetailsPage() {
  const { id } = useParams();
  const router = useRouter();

  const [mock, setMock] = useState<MockDetails | null>(null);
  const [expandedQuestionId, setExpandedQuestionId] = useState<string | null>(
    null,
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMock();
  }, []);

  const fetchMock = async () => {
    try {
      const res = await fetch(`/api/mocks/${id}`);
      const data = await res.json();
      setMock(data.mock);
    } catch {
      toast.error("Failed to load mock");
    } finally {
      setLoading(false);
    }
  };

  const deriveStatus = () => {
    if (!mock) return "";
    const now = Date.now();
    const start = new Date(mock.startTime).getTime();
    const end = start + mock.durationMinutes * 60 * 1000;

    if (now < start) return "Scheduled";
    if (now <= end) return "Live";
    return "Completed";
  };

  if (loading) return <div className="p-10">Loading...</div>;
  if (!mock) return <div className="p-10">Mock not found</div>;

  const status = deriveStatus();

  const getExplanationText = (question: Question) => {
    if (!question.explanation) return "No explanation provided.";
    if (typeof question.explanation === "string") return question.explanation;
    if (typeof question.explanation?.text === "string") {
      return question.explanation.text;
    }
    return "No explanation provided.";
  };

  const getQuestionPreview = (text: string, maxLength = 96) => {
    if (text.length <= maxLength) return text;
    return `${text.slice(0, maxLength)}...`;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-50 to-white">

      {/* TOP NAV */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between">

          <div className="flex items-center gap-6">

            <button
              onClick={() => router.push("/dashboard/assesments/grand-mocks")}
              className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-900 transition"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-zinc-900">
                {mock.title}
              </h1>

              <div className="mt-2 flex gap-6 text-xs text-zinc-500">

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
              </div>
            </div>
          </div>

          <div
            className={`px-4 py-1 rounded-full text-xs font-medium ${
              status === "Live"
                ? "bg-emerald-100 text-emerald-700"
                : status === "Scheduled"
                ? "bg-indigo-100 text-indigo-700"
                : "bg-zinc-200 text-zinc-700"
            }`}
          >
            {status}
          </div>
        </div>
      </div>

      {/* MAIN LAYOUT */}
      <div className="max-w-7xl mx-auto px-8 py-10">
        <div className="rounded-3xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-zinc-200 bg-zinc-50/70">
            <h2 className="text-lg font-semibold text-zinc-900">Questions</h2>
            <p className="text-sm text-zinc-500 mt-1">
              Expand any row to view complete options and explanation.
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
                <TableHead className="w-[120px] text-right pr-4">Action</TableHead>
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

                      <TableCell className="px-4 text-zinc-800 whitespace-normal leading-relaxed">
                        {getQuestionPreview(question.questionText)}
                      </TableCell>

                      <TableCell className="text-zinc-600">
                        {question.options?.length ?? 0}
                      </TableCell>

                      <TableCell className="text-zinc-700 whitespace-normal">
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

                      <TableCell className="text-right pr-4">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedQuestionId(isExpanded ? null : question.id)
                          }
                          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-100 transition"
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
                      <TableRow className="bg-zinc-50/60 hover:bg-zinc-50/60">
                        <TableCell colSpan={6} className="p-0">
                          <div className="px-6 py-6 border-t border-zinc-200">
                            <div className="grid gap-6 lg:grid-cols-2">
                              <div>
                                <h3 className="text-sm font-semibold text-zinc-800 mb-2">
                                  Full Question
                                </h3>
                                <p className="text-sm text-zinc-700 leading-relaxed">
                                  {question.questionText}
                                </p>
                              </div>

                              <div>
                                <h3 className="text-sm font-semibold text-zinc-800 mb-2">
                                  Explanation
                                </h3>
                                <p className="text-sm text-zinc-700 leading-relaxed">
                                  {getExplanationText(question)}
                                </p>
                              </div>
                            </div>

                            <div className="mt-6">
                              <h3 className="text-sm font-semibold text-zinc-800 mb-3">
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

                                      <p className="flex-1 text-sm text-zinc-700 whitespace-normal">
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