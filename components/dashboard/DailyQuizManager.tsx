"use client";

import { useEffect, useState } from "react";
import { CalendarDays, Users, Sparkles, Upload, ImageUp } from "lucide-react";
import { toast } from "sonner";

interface QuizState {
  question: string;
  image: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export default function DailyQuizManager() {
  const [quiz, setQuiz] = useState<QuizState>({
    question: "",
    image: "",
    options: ["", "", "", ""],
    correctIndex: 0,
    explanation: "",
  });

  const [live, setLive] = useState<any>(null);
  const [aiTopic, setAiTopic] = useState("");
  const [loadingAI, setLoadingAI] = useState(false);
  const [publishing, setPublishing] = useState(false);

  /* ───────── FETCH LIVE QUIZ ───────── */
  useEffect(() => {
    async function fetchLive() {
      try {
        const res = await fetch("/api/daily-quiz");
        const data = await res.json();
        setLive(data.quiz ?? null);
      } catch {
        toast.error("Failed to fetch live quiz");
      }
    }
    fetchLive();
  }, []);

  /* ───────── STATE HELPERS ───────── */

  const update = (field: keyof QuizState, value: any) =>
    setQuiz((prev) => ({ ...prev, [field]: value }));

  const updateOption = (value: string, index: number) => {
    const updated = [...quiz.options];
    updated[index] = value;
    update("options", updated);
  };

  const isValid =
    quiz.question.trim() &&
    quiz.options.every((o) => o.trim() !== "") &&
    quiz.explanation.trim();

  /* ───────── IMAGE UPLOAD ───────── */
  async function handleImageUpload(
  e: React.ChangeEvent<HTMLInputElement>
) {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("folder", "daily_quiz");

  const toastId = toast.loading("Uploading image...");

  try {
    const res = await fetch("/api/upload-image", {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error(`Upload failed (${res.status})`);
    }

    const data = await res.json();

    update("image", data.url);

    toast.success("Image uploaded successfully 🚀", {
      id: toastId,
      description: "Preview updated instantly.",
    });

  } catch (err: any) {
    toast.error("Image upload failed ❌", {
      id: toastId,
      description: err.message || "Please try again.",
    });
  }
}



  /* ───────── AI GENERATE ───────── */

  async function generateAI() {
    if (!aiTopic.trim()) {
      toast.warning("Please enter a topic first");
      return;
    }

    try {
      setLoadingAI(true);

      const loadingToast = toast.loading("Generating AI question...");

      const res = await fetch("/api/daily-quiz/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic: aiTopic }),
      });

      if (!res.ok) throw new Error();

      const data = await res.json();

      setQuiz(data.quiz);

      toast.dismiss(loadingToast);
      toast.success("✨ AI Question Generated!", {
        description: "You can edit before publishing.",
      });

    } catch {
      toast.error("AI generation failed");
    } finally {
      setLoadingAI(false);
    }
  }

  /* ───────── PUBLISH QUIZ ───────── */

  async function publishQuiz() {
    if (!isValid) {
      toast.warning("Please complete all fields");
      return;
    }

    try {
      setPublishing(true);

      const loadingToast = toast.loading("Publishing quiz...");

      const res = await fetch("/api/daily-quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(quiz),
      });

      if (!res.ok) throw new Error();

      const now = new Date();

      setLive({
        ...quiz,
        createdAt: now,
        submissions: 0,
      });

      toast.dismiss(loadingToast);
      toast.success("🚀 Quiz Published Successfully!", {
        description: "Today's quiz is now live.",
      });

    } catch {
      toast.error("Failed to publish quiz");
    } finally {
      setPublishing(false);
    }
  }

  return (
    <div className="rounded-3xl bg-gradient-to-br from-white to-slate-50 border shadow-xl p-8">

      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-bold text-slate-800">
          Daily Quiz Manager
        </h2>
        <p className="text-sm text-slate-500">
          Create, manage and publish today’s quiz
        </p>
      </div>

      <div className="flex flex-col xl:flex-row gap-8">

        {/* ───────── LIVE SECTION ───────── */}
        <div className="xl:w-1/4 space-y-5">

          <div className="rounded-2xl bg-white border p-5 shadow-sm hover:shadow-md transition">

            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-semibold">
                Live Today
              </span>

              <span
                className={`text-xs px-3 py-1 rounded-full
                ${live
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                  }`}
              >
                {live ? "LIVE" : "NOT LIVE"}
              </span>
            </div>

            {live ? (
              <>
                <p className="text-sm text-slate-700 line-clamp-4">
                  {live.question}
                </p>

                <div className="flex items-center justify-between text-xs text-slate-500 mt-4">
                  <div className="flex items-center gap-1">
  <CalendarDays className="h-4 w-4" />
  {live.createdAt && (
    <span>
      {(() => {
        const date = live.createdAt?._seconds
          ? new Date(live.createdAt._seconds * 1000)
          : new Date(live.createdAt);

        return date.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        });
      })()}
    </span>
  )}
</div>


                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    {live.submissions ?? 0}
                  </div>
                </div>
              </>
            ) : (
              <p className="text-sm text-slate-400">
                No quiz published today.
              </p>
            )}
          </div>
        </div>

        {/* ───────── FORM SECTION ───────── */}
        <div className="flex-1 space-y-6">

          {/* AI Section (Always Visible Now) */}
          <div className="rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 p-5 text-white shadow-lg transition">

            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="h-5 w-5" />
              <span className="font-semibold">
                Generate with AI
              </span>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                placeholder="Enter topic (e.g. Renal Cell Carcinoma)"
                className="flex-1 rounded-xl px-4 py-2 text-black"
                value={aiTopic}
                onChange={(e) => setAiTopic(e.target.value)}
              />
              <button
                onClick={generateAI}
                disabled={loadingAI}
                className="bg-white text-purple-700 font-semibold px-5 py-2 rounded-xl transition hover:scale-105"
              >
                {loadingAI ? "Generating..." : "Generate"}
              </button>
            </div>
          </div>

          {/* Question */}
          <textarea
            placeholder="Enter question..."
            className="w-full border rounded-2xl p-4 text-sm"
            value={quiz.question}
            onChange={(e) => update("question", e.target.value)}
          />

           <div className="flex items-center gap-3">
    <input
      type="text"
      placeholder="Image URL"
      className="flex-1 border rounded-2xl px-4 py-3 text-sm"
      value={quiz.image}
      onChange={(e) => update("image", e.target.value)}
    />

    <label className="cursor-pointer bg-black text-white p-3 rounded-2xl hover:bg-slate-800 transition">
      <ImageUp className="h-5 w-5" />
      <input
        type="file"
        accept="image/*"
        hidden
        onChange={handleImageUpload}
      />
    </label>
  </div>

          {/* Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quiz.options.map((opt, index) => (
              <div key={index} className="flex items-center gap-3">
                <input
                  type="radio"
                  checked={quiz.correctIndex === index}
                  onChange={() => update("correctIndex", index)}
                />
                <input
                  className="flex-1 border rounded-xl p-2 text-sm"
                  placeholder={`Option ${index + 1}`}
                  value={opt}
                  onChange={(e) =>
                    updateOption(e.target.value, index)
                  }
                />
              </div>
            ))}
          </div>

          {/* Explanation */}
          <textarea
            placeholder="Enter explanation..."
            className="w-full border rounded-2xl p-4 text-sm"
            value={quiz.explanation}
            onChange={(e) => update("explanation", e.target.value)}
          />

          {/* Publish Button */}
          <button
            onClick={publishQuiz}
            disabled={!isValid || publishing}
            className={`w-full py-3 rounded-2xl font-semibold transition
              ${
                isValid
                  ? "bg-black text-white hover:bg-slate-800"
                  : "bg-slate-200 text-slate-400 cursor-not-allowed"
              }`}
          >
            {publishing ? "Publishing..." : "Publish Quiz 🚀"}
          </button>

        </div>

        {/* ───────── IMAGE PREVIEW ───────── */}
        <div className="xl:w-1/3 w-full">
          <div className="aspect-square md:aspect-video xl:aspect-square rounded-3xl overflow-hidden shadow-lg border bg-slate-100">

            {quiz.image ? (
              <img
                src={quiz.image}
                alt="preview"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Image Preview
              </div>
            )}

          </div>
        </div>

      </div>
    </div>
  );
}
