"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, Edit, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import Link from "next/link";

interface Question {
  id: string;
  questionText: string;
  questionImage?: string;
  options: string[];
  correctAnswer: number;
  explanation?: {
    text?: string;
    image?: string;
  };
}

export default function BankQuestionsPage() {
  const params = useParams();
  const bankId = params.bankId as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [bankTitle, setBankTitle] = useState("");
  const [section, setSection] = useState("");
  const [loading, setLoading] = useState(true);

  /* ───────── FETCH DATA ───────── */

  useEffect(() => {
    if (!bankId) return;

    async function fetchData() {
      try {
        setLoading(true);

        // 1️⃣ fetch bank
        const bankRes = await fetch(`/api/question-banks/${bankId}`);
        const bankData = await bankRes.json();

        setBankTitle(bankData.bank?.title || "");
        setSection(bankData.bank?.section || "");

        // 2️⃣ fetch questions
        const qRes = await fetch(
          `/api/questions?bankId=${bankId}`
        );
        const qData = await qRes.json();

        setQuestions(qData.questions || []);

      } catch (err) {
        toast.error("Failed to load questions");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [bankId]);

  /* ───────── DELETE QUESTION ───────── */

  async function deleteQuestion(id: string) {
    try {
      const res = await fetch(`/api/questions/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) throw new Error();

      setQuestions((prev) =>
        prev.filter((q) => q.id !== id)
      );

      toast.success("Question deleted");

    } catch {
      toast.error("Failed to delete question");
    }
  }

  /* ───────── UI ───────── */

  if (loading) {
  return (
    <div className="space-y-6">
      
      <div className="h-6 w-56 bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 animate-pulse rounded-md" />

      <div className="grid md:grid-cols-2 gap-6">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-6 rounded-3xl border bg-gradient-to-br from-white to-slate-50 shadow-md"
          >
            <div className="h-4 w-40 bg-slate-200 rounded mb-4 animate-pulse" />
            <div className="h-3 w-28 bg-slate-200 rounded mb-2 animate-pulse" />
            <div className="h-16 w-full bg-slate-100 rounded-xl animate-pulse" />
          </div>
        ))}
      </div>
    </div>
  );
}


  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex items-center justify-between">

        <div>
          <Link
            href="/dashboard/content/questions"
            className="text-sm text-muted-foreground flex items-center gap-2 mb-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Banks
          </Link>

          <h1 className="text-2xl font-bold">
            {bankTitle}
          </h1>

          <Badge className="mt-2">
            {section === "section1"
              ? "Section 1"
              : "Section 2"}
          </Badge>
        </div>

        <p className="text-muted-foreground">
          {questions.length} Questions
        </p>
      </div>

      {/* EMPTY STATE */}
      {questions.length === 0 && (
        <Card className="p-12 text-center text-muted-foreground">
          No questions added yet.
        </Card>
      )}

      {/* QUESTIONS */}
      <div className="grid gap-6">
        {questions.map((q) => (
          <Card key={q.id} className="p-6">

            <CardContent className="space-y-4">

              {/* QUESTION */}
              <div>
                <p className="font-medium">
                  {q.questionText}
                </p>

                {q.questionImage && (
                  <img
                    src={q.questionImage}
                    className="mt-4 rounded-xl border max-h-64 object-cover"
                  />
                )}
              </div>

              {/* OPTIONS */}
              <div className="grid grid-cols-2 gap-3">
                {q.options.map((opt, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-lg border text-sm
                      ${
                        i === q.correctAnswer
                          ? "border-teal-500 bg-teal-50 font-medium"
                          : "border-slate-200"
                      }`}
                  >
                    {opt}
                  </div>
                ))}
              </div>

              {/* EXPLANATION */}
              {q.explanation?.text && (
                <div className="text-sm text-muted-foreground">
                  {q.explanation.text}
                </div>
              )}

              {q.explanation?.image && (
                <img
                  src={q.explanation.image}
                  className="rounded-xl border max-h-48 object-cover"
                />
              )}

              {/* ACTIONS */}
              <div className="flex justify-end gap-2 pt-4">

                <Button
                  size="icon"
                  variant="ghost"
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteQuestion(q.id)}
                >
                  <Trash2 className="h-4 w-4 text-red-500" />
                </Button>

              </div>

            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
