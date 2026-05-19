"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Edit, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { adminFetch } from "@/lib/client/adminApi";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

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

type EditableQuestionForm = {
  questionText: string;
  questionImage: string;
  options: string[];
  correctAnswer: number;
  explanationText: string;
  explanationImage: string;
};

function createQuestionForm(question: Question): EditableQuestionForm {
  return {
    questionText: question.questionText ?? "",
    questionImage: question.questionImage ?? "",
    options:
      Array.isArray(question.options) && question.options.length === 5
        ? [...question.options]
        : ["", "", "", "", ""],
    correctAnswer:
      typeof question.correctAnswer === "number" ? question.correctAnswer : 0,
    explanationText: question.explanation?.text ?? "",
    explanationImage: question.explanation?.image ?? "",
  };
}

export default function BankQuestionsPage() {
  const params = useParams();
  const bankId = params.bankId as string;

  const [questions, setQuestions] = useState<Question[]>([]);
  const [bankTitle, setBankTitle] = useState("");
  const [section, setSection] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editForm, setEditForm] = useState<EditableQuestionForm | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (!bankId) return;

    async function fetchData() {
      try {
        setLoading(true);

        const bankRes = await adminFetch(`/api/question-banks/${bankId}`);
        const bankData = await bankRes.json().catch(() => null);

        if (!bankRes.ok) {
          throw new Error(bankData?.error || "Failed to load question bank");
        }

        setBankTitle(bankData.bank?.title || "");
        setSection(bankData.bank?.section || "");

        const questionRes = await adminFetch(`/api/questions?bankId=${bankId}`);
        const questionData = await questionRes.json().catch(() => null);

        if (!questionRes.ok) {
          throw new Error(questionData?.error || "Failed to load questions");
        }

        setQuestions(questionData.questions || []);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "Failed to load questions"
        );
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, [bankId]);

  async function deleteQuestion(id: string) {
    try {
      const res = await adminFetch(`/api/questions/${id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete question");
      }

      setQuestions((current) => current.filter((question) => question.id !== id));
      toast.success("Question deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete question"
      );
    }
  }

  function openEditDialog(question: Question) {
    setEditingQuestion(question);
    setEditForm(createQuestionForm(question));
  }

  function closeEditDialog() {
    setEditingQuestion(null);
    setEditForm(null);
    setSavingEdit(false);
  }

  function updateOption(index: number, value: string) {
    setEditForm((current) => {
      if (!current) return current;

      const options = [...current.options];
      options[index] = value;

      return {
        ...current,
        options,
      };
    });
  }

  async function saveQuestionEdit() {
    if (!editingQuestion || !editForm) return;

    const questionText = editForm.questionText.trim();
    const options = editForm.options.map((option) => option.trim());

    if (!questionText) {
      toast.error("Question text is required");
      return;
    }

    if (options.some((option) => !option)) {
      toast.error("All 5 options are required");
      return;
    }

    if (editForm.correctAnswer < 0 || editForm.correctAnswer > 4) {
      toast.error("Select a valid correct answer");
      return;
    }

    try {
      setSavingEdit(true);

      const payload = {
        questionText,
        questionImage: editForm.questionImage.trim(),
        options,
        correctAnswer: editForm.correctAnswer,
        explanation: {
          text: editForm.explanationText.trim(),
          image: editForm.explanationImage.trim(),
        },
      };

      const res = await adminFetch(`/api/questions/${editingQuestion.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to update question");
      }

      setQuestions((current) =>
        current.map((question) =>
          question.id === editingQuestion.id
            ? {
                ...question,
                ...payload,
              }
            : question
        )
      );

      toast.success("Question updated");
      closeEditDialog();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to update question"
      );
      setSavingEdit(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="h-6 w-56 animate-pulse rounded-md bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200" />

        <div className="grid gap-6 md:grid-cols-2">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="rounded-3xl border bg-gradient-to-br from-white to-slate-50 p-6 shadow-md"
            >
              <div className="mb-4 h-4 w-40 animate-pulse rounded bg-slate-200" />
              <div className="mb-2 h-3 w-28 animate-pulse rounded bg-slate-200" />
              <div className="h-16 w-full animate-pulse rounded-xl bg-slate-100" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <Dialog
        open={Boolean(editingQuestion && editForm)}
        onOpenChange={(open) => {
          if (!open) {
            closeEditDialog();
          }
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>

          {editForm && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label>Question Text</Label>
                <Textarea
                  rows={4}
                  value={editForm.questionText}
                  onChange={(e) =>
                    setEditForm((current) =>
                      current
                        ? { ...current, questionText: e.target.value }
                        : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Question Image URL</Label>
                <Input
                  value={editForm.questionImage}
                  onChange={(e) =>
                    setEditForm((current) =>
                      current
                        ? { ...current, questionImage: e.target.value }
                        : current
                    )
                  }
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {editForm.options.map((option, index) => (
                  <div key={index} className="space-y-2">
                    <Label>{`Option ${index + 1}`}</Label>
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                    />
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <Label>Correct Answer</Label>
                <div className="grid gap-2 sm:grid-cols-5">
                  {editForm.options.map((option, index) => {
                    const selected = editForm.correctAnswer === index;

                    return (
                      <button
                        key={index}
                        type="button"
                        onClick={() =>
                          setEditForm((current) =>
                            current
                              ? { ...current, correctAnswer: index }
                              : current
                          )
                        }
                        className={`rounded-xl border px-3 py-3 text-left text-sm transition ${
                          selected
                            ? "border-teal-600 bg-teal-50 text-teal-700"
                            : "border-slate-200 hover:border-slate-300"
                        }`}
                      >
                        <div className="font-medium">{`Option ${index + 1}`}</div>
                        <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                          {option || "Empty option"}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Explanation Text</Label>
                <Textarea
                  rows={4}
                  value={editForm.explanationText}
                  onChange={(e) =>
                    setEditForm((current) =>
                      current
                        ? { ...current, explanationText: e.target.value }
                        : current
                    )
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Explanation Image URL</Label>
                <Input
                  value={editForm.explanationImage}
                  onChange={(e) =>
                    setEditForm((current) =>
                      current
                        ? { ...current, explanationImage: e.target.value }
                        : current
                    )
                  }
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={closeEditDialog}
                  disabled={savingEdit}
                >
                  Cancel
                </Button>
                <Button onClick={saveQuestionEdit} disabled={savingEdit}>
                  {savingEdit ? "Saving..." : "Save Question"}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/dashboard/content/questions"
            className="mb-2 flex items-center gap-2 text-sm text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Banks
          </Link>

          <h1 className="text-2xl font-bold">{bankTitle}</h1>

          <Badge className="mt-2">
            {section === "section1" ? "Section 1" : "Section 2"}
          </Badge>
        </div>

        <p className="text-muted-foreground">{questions.length} Questions</p>
      </div>

      {questions.length === 0 && (
        <Card className="p-12 text-center text-muted-foreground">
          No questions added yet.
        </Card>
      )}

      <div className="grid gap-6">
        {questions.map((question) => (
          <Card key={question.id} className="p-6">
            <CardContent className="space-y-4">
              <div>
                <p className="font-medium">{question.questionText}</p>

                {question.questionImage && (
                  <img
                    src={question.questionImage}
                    alt=""
                    className="mt-4 max-h-64 rounded-xl border object-cover"
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {question.options.map((option, index) => (
                  <div
                    key={index}
                    className={`rounded-lg border p-3 text-sm ${
                      index === question.correctAnswer
                        ? "border-teal-500 bg-teal-50 font-medium"
                        : "border-slate-200"
                    }`}
                  >
                    {option}
                  </div>
                ))}
              </div>

              {question.explanation?.text && (
                <div className="text-sm text-muted-foreground">
                  {question.explanation.text}
                </div>
              )}

              {question.explanation?.image && (
                <img
                  src={question.explanation.image}
                  alt=""
                  className="max-h-48 rounded-xl border object-cover"
                />
              )}

              <div className="flex justify-end gap-2 pt-4">
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => openEditDialog(question)}
                >
                  <Edit className="h-4 w-4" />
                </Button>

                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => deleteQuestion(question.id)}
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
