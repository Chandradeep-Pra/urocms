"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { adminFetch } from "@/lib/client/adminApi";
import { QuestionBank } from "../questions/QuestionBankManager";
import SearchBar from "../SearchBar";

type EditableQuiz = {
  id: string;
  title: string;
  description?: string;
  type?: string;
  durationMinutes?: number;
  bankIds?: string[];
  questionIds?: string[];
};

type QuizBuilderProps = {
  initialQuiz?: EditableQuiz | null;
  onSaved?: () => void | Promise<void>;
  onCancelEdit?: () => void;
};

const createEmptyQuiz = () => ({
  title: "",
  description: "",
  type: "chapter",
  durationMinutes: 60,
  randomizeQuestions: false,
  randomizeOptions: false,
  bankIds: [] as string[],
  questionIds: [] as string[],
});

export default function QuizBuilderPage({
  initialQuiz = null,
  onSaved,
  onCancelEdit,
}: QuizBuilderProps) {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<QuestionBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openBanks, setOpenBanks] = useState<string[]>([]);
  const [bankQuestions, setBankQuestions] = useState<Record<string, any[]>>({});
  const [loadingQuestions, setLoadingQuestions] = useState<string | null>(null);
  const [quiz, setQuiz] = useState(createEmptyQuiz);

  const isEditing = Boolean(initialQuiz?.id);

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    setFilteredBanks(banks);
  }, [banks]);

  useEffect(() => {
    if (!initialQuiz) {
      setQuiz(createEmptyQuiz());
      return;
    }

    setQuiz({
      title: initialQuiz.title || "",
      description: initialQuiz.description || "",
      type: initialQuiz.type || "chapter",
      durationMinutes: initialQuiz.durationMinutes || 60,
      randomizeQuestions: false,
      randomizeOptions: false,
      bankIds: Array.isArray(initialQuiz.bankIds) ? initialQuiz.bankIds : [],
      questionIds: Array.isArray(initialQuiz.questionIds) ? initialQuiz.questionIds : [],
    });
  }, [initialQuiz]);

  const loadBanks = async () => {
    try {
      const res = await adminFetch("/api/question-banks");
      const data = await res.json();
      setBanks(data.banks || []);
    } catch (error) {
      console.error("Failed to load banks", error);
      toast.error("Failed to load question banks");
    } finally {
      setLoadingBanks(false);
    }
  };

  const resetBuilder = () => {
    setQuiz(createEmptyQuiz());
    setOpenBanks([]);
    setBankQuestions({});
  };

  const handleSave = async () => {
    if (!quiz.title.trim()) {
      toast.error("Quiz title required");
      return;
    }

    if (quiz.durationMinutes <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }

    try {
      setSaving(true);

      const endpoint = isEditing ? `/api/quizzes/${initialQuiz?.id}` : "/api/quizzes";
      const method = isEditing ? "PUT" : "POST";

      const res = await adminFetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...quiz,
          isActive: true,
        }),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save quiz");
      }

      toast.success(isEditing ? "Quiz updated successfully" : "Quiz created successfully");

      if (isEditing) {
        await onSaved?.();
      } else {
        resetBuilder();
        await onSaved?.();
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save quiz");
    } finally {
      setSaving(false);
    }
  };

  const toggleExpand = async (bankId: string) => {
    const isOpen = openBanks.includes(bankId);

    if (isOpen) {
      setOpenBanks((prev) => prev.filter((id) => id !== bankId));
      return;
    }

    setOpenBanks((prev) => [...prev, bankId]);

    if (bankQuestions[bankId]) return;

    try {
      setLoadingQuestions(bankId);
      const res = await adminFetch(`/api/questions?bankId=${bankId}`);
      const data = await res.json();

      setBankQuestions((prev) => ({
        ...prev,
        [bankId]: data.questions || [],
      }));
    } catch {
      toast.error("Failed to load questions");
    } finally {
      setLoadingQuestions(null);
    }
  };

  const toggleQuestion = (questionId: string) => {
    setQuiz((prev) => ({
      ...prev,
      questionIds: prev.questionIds.includes(questionId)
        ? prev.questionIds.filter((id) => id !== questionId)
        : [...prev.questionIds, questionId],
    }));
  };

  const importFullBank = (bankId: string) => {
    setQuiz((prev) => ({
      ...prev,
      bankIds: prev.bankIds.includes(bankId)
        ? prev.bankIds.filter((id) => id !== bankId)
        : [...prev.bankIds, bankId],
    }));
  };

  return (
    <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-2">
      <Card>
        <CardContent className="space-y-5 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-semibold">
                {isEditing ? "Edit Quiz" : "Quiz Settings"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isEditing ? "Update the selected quiz." : "Create a quiz from your question banks."}
              </p>
            </div>
            {isEditing ? (
              <Button type="button" variant="outline" onClick={onCancelEdit}>
                Cancel Edit
              </Button>
            ) : null}
          </div>

          <Input
            placeholder="Quiz Title"
            value={quiz.title}
            onChange={(e) => setQuiz((prev) => ({ ...prev, title: e.target.value }))}
          />

          <Textarea
            placeholder="Description"
            value={quiz.description}
            onChange={(e) =>
              setQuiz((prev) => ({
                ...prev,
                description: e.target.value,
              }))
            }
          />

          <Select
            value={quiz.type}
            onValueChange={(v: any) =>
              setQuiz((prev) => ({
                ...prev,
                type: v,
              }))
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Quiz Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="chapter">Chapter Quiz</SelectItem>
              <SelectItem value="mock">Mock</SelectItem>
              <SelectItem value="grand-mock">Grand Mock</SelectItem>
            </SelectContent>
          </Select>

          <Input
            type="number"
            min={1}
            value={quiz.durationMinutes}
            onChange={(e) =>
              setQuiz((prev) => ({
                ...prev,
                durationMinutes: Math.max(1, Number(e.target.value)),
              }))
            }
          />

          <Button disabled={saving} onClick={handleSave} className="w-full bg-black text-white">
            {saving
              ? isEditing
                ? "Updating..."
                : "Saving..."
              : isEditing
                ? "Update Quiz"
                : "Save Quiz"}
          </Button>
        </CardContent>
      </Card>

      <Card className="h-[600px] flex flex-col">
        <CardContent className="flex h-full flex-col p-6">
          <h2 className="mb-4 text-xl font-semibold">Question Banks</h2>

          <SearchBar
            data={banks}
            keys={["title"]}
            onResults={setFilteredBanks}
            placeholder="Search question banks..."
          />

          <div className="mt-5 flex-1 space-y-3 overflow-y-auto pr-2">
            {loadingBanks ? (
              <p className="text-sm text-muted-foreground">Loading banks...</p>
            ) : null}

            {!loadingBanks && filteredBanks.length === 0 ? (
              <p className="text-sm text-muted-foreground">No banks found</p>
            ) : null}

            {filteredBanks.map((bank) => {
              const selected = quiz.bankIds.includes(bank.id);
              const isOpen = openBanks.includes(bank.id);
              const questions = bankQuestions[bank.id] || [];

              return (
                <div key={bank.id} className="rounded-xl border transition-all">
                  <div className="flex items-center justify-between p-4 hover:bg-slate-50">
                    <div>
                      <p className="font-medium">{bank.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {bank.questionCount} questions
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant={selected ? "outline" : "default"}
                        onClick={() => importFullBank(bank.id)}
                      >
                        {selected ? "Remove Full" : "Import Full"}
                      </Button>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => toggleExpand(bank.id)}
                        className={`${isOpen ? "bg-orange-300" : "bg-blue-300"}`}
                      >
                        {isOpen ? "Hide" : "View"}
                      </Button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="max-h-60 space-y-2 overflow-y-auto border-t bg-slate-50 px-4 py-3">
                      {loadingQuestions === bank.id ? (
                        <p className="text-xs text-muted-foreground">Loading questions...</p>
                      ) : null}

                      {questions.map((q: any) => {
                        const checked = quiz.questionIds.includes(q.id);

                        return (
                          <label key={q.id} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleQuestion(q.id)}
                            />
                            <span className="truncate">{q.questionText}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>

          <div className="mt-4 border-t pt-4 text-sm text-muted-foreground">
            Selected Banks: {quiz.bankIds.length}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
