"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  FileText,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";

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
  const [activeIndex, setActiveIndex] = useState(0);
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
  const activeQuestion = mock.questions?.[activeIndex];

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
      <div className="max-w-7xl mx-auto px-8 py-10 flex gap-10">

        {/* SIDEBAR */}
        <div className="w-28 shrink-0">
          <div className="sticky top-28 space-y-2">

            {mock.questions?.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-full py-3 rounded-xl text-sm font-medium transition-all ${
                  activeIndex === index
                    ? "bg-indigo-600 text-white shadow-md"
                    : "bg-white border border-zinc-200 hover:bg-zinc-100"
                }`}
              >
                Q{index + 1}
              </button>
            ))}

          </div>
        </div>

        {/* QUESTION PANEL */}
        <div className="flex-1 bg-white border border-zinc-200 rounded-3xl p-12 shadow-sm">

          <div className="mb-10">
            <p className="text-xs text-zinc-500 uppercase tracking-wider mb-3">
              Question {activeIndex + 1}
            </p>

            <h2 className="text-xl text-zinc-900 leading-relaxed">
              {activeQuestion?.questionText}
            </h2>
          </div>

          {/* OPTIONS */}
          <div className="space-y-4">

            {activeQuestion?.options?.map((option, i) => {
              const isCorrect =
                option === activeQuestion.correctAnswer;

              return (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-4 rounded-2xl transition border ${
                    isCorrect
                      ? "border-emerald-400 bg-emerald-50"
                      : "border-zinc-200 bg-zinc-50 hover:bg-zinc-100"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      isCorrect
                        ? "bg-emerald-500 text-white"
                        : "bg-white border border-zinc-300"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}
                  </div>

                  <span className="flex-1 text-sm text-zinc-800">
                    {option}
                  </span>

                  {isCorrect && (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  )}
                </div>
              );
            })}

          </div>

          {/* EXPLANATION */}
          {activeQuestion?.explanation?.text && (
            <div className="mt-12 pt-8 border-t border-zinc-200">

              <h3 className="text-sm font-semibold text-zinc-700 mb-3">
                Explanation
              </h3>

              <p className="text-sm text-zinc-600 leading-relaxed">
                {activeQuestion.explanation.text}
              </p>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}