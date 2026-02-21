"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  FileText,
  CheckCircle2,
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
    <div className="min-h-screen bg-zinc-50">

      {/* HERO */}
      <div className="border-b bg-white">
        <div className="max-w-7xl mx-auto px-8 py-8 flex items-start justify-between">

          <div>
            <h1 className="text-3xl font-semibold tracking-tight">
              {mock.title}
            </h1>

            <div className="mt-4 flex gap-6 text-sm text-muted-foreground">

              <div className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                {new Date(mock.startTime).toLocaleString()}
              </div>

              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {mock.durationMinutes} min
              </div>

              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {mock.questions?.length} questions
              </div>
            </div>
          </div>

          <div
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              status === "Live"
                ? "bg-emerald-100 text-emerald-700"
                : status === "Scheduled"
                ? "bg-blue-100 text-blue-700"
                : "bg-zinc-200 text-zinc-700"
            }`}
          >
            {status}
          </div>
        </div>
      </div>

      {/* CONTENT AREA */}
      <div className="max-w-7xl mx-auto px-8 py-10 flex gap-10">

        {/* LEFT NAV */}
        <div className="w-32 shrink-0">
          <div className="sticky top-24 space-y-2">

            {mock.questions?.map((_, index) => (
              <button
                key={index}
                onClick={() => setActiveIndex(index)}
                className={`w-full py-3 rounded-xl text-sm font-medium transition ${
                  activeIndex === index
                    ? "bg-zinc-900 text-white"
                    : "bg-white border hover:bg-zinc-100"
                }`}
              >
                Q{index + 1}
              </button>
            ))}

          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-1 bg-white border rounded-2xl p-10 shadow-sm">

          <div className="mb-8">
            <p className="text-sm text-muted-foreground mb-2">
              Question {activeIndex + 1}
            </p>

            <h2 className="text-xl font-medium leading-relaxed">
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
                  className={`flex items-center gap-4 p-4 rounded-xl border transition ${
                    isCorrect
                      ? "border-emerald-400 bg-emerald-50"
                      : "bg-zinc-50"
                  }`}
                >
                  <div className="w-8 h-8 rounded-full bg-white border flex items-center justify-center text-sm font-medium">
                    {String.fromCharCode(65 + i)}
                  </div>

                  <span className="flex-1">{option}</span>

                  {isCorrect && (
                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  )}
                </div>
              );
            })}

          </div>

          {/* EXPLANATION */}
          {activeQuestion?.explanation?.text && (
            <div className="mt-10 pt-8 border-t">

              <h3 className="text-sm font-semibold mb-3 text-zinc-700">
                Explanation
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {activeQuestion.explanation.text}
              </p>

            </div>
          )}

        </div>
      </div>
    </div>
  );
}