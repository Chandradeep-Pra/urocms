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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { QuestionBank } from "../questions/QuestionBankManager";
import SearchBar from "../SearchBar";

export default function QuizBuilderPage() {
  const [banks, setBanks] = useState<QuestionBank[]>([]);
  const [filteredBanks, setFilteredBanks] = useState<QuestionBank[]>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [saving, setSaving] = useState(false);
  const [openBanks, setOpenBanks] = useState<string[]>([]);
  const [bankQuestions, setBankQuestions] = useState<Record<string, any[]>>({});
  const [loadingQuestions, setLoadingQuestions] = useState<string | null>(null);

  const [quiz, setQuiz] = useState({
    title: "",
    description: "",
    type: "chapter",
    durationMinutes: 60,
    randomizeQuestions: false,
    randomizeOptions: false,
    bankIds: [] as string[],
    questionIds: [] as string[],
  });

  /* ───────── LOAD BANKS ───────── */

  useEffect(() => {
    loadBanks();
  }, []);

  useEffect(() => {
    setFilteredBanks(banks);
  }, [banks]);

  const loadBanks = async () => {
    try {
      const res = await fetch("/api/question-banks");
      const data = await res.json();
      setBanks(data.banks || []);
    } catch (err) {
      console.error("Failed to load banks", err);
      toast.error("Failed to load question banks");
    } finally {
      setLoadingBanks(false);
    }
  };

  /* ───────── SAVE QUIZ ───────── */

  const handleSave = async () => {
    if (!quiz.title.trim()) {
      toast.error("Quiz title required");
      return;
    }

    // if (quiz.bankIds.length === 0) {
    //   toast.error("Select at least one bank");
    //   return;
    // }

    if (quiz.durationMinutes <= 0) {
      toast.error("Duration must be greater than 0");
      return;
    }

    try {
      setSaving(true);

      const res = await fetch("/api/quizzes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...quiz,
          isActive: true,
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Quiz created successfully");

      // Reset form
      setQuiz({
        title: "",
        description: "",
        type: "chapter",
        durationMinutes: 60,
        randomizeQuestions: false,
        randomizeOptions: false,
        bankIds: [],
        questionIds: [],
      });

    } catch (err) {
      toast.error("Failed to create quiz");
    } finally {
      setSaving(false);
    }
  };

  /* ───────── ADD / REMOVE BANK ───────── */

  const toggleBank = (bankId: string) => {
    setQuiz((prev) => ({
      ...prev,
      bankIds: prev.bankIds.includes(bankId)
        ? prev.bankIds.filter((id) => id !== bankId)
        : [...prev.bankIds, bankId],
    }));
  };

  const toggleExpand = async (bankId: string) => {
  const isOpen = openBanks.includes(bankId);

  if (isOpen) {
    setOpenBanks(prev => prev.filter(id => id !== bankId));
    return;
  }

  setOpenBanks(prev => [...prev, bankId]);

  // If questions already loaded, don't refetch
  if (bankQuestions[bankId]) return;

  try {
    setLoadingQuestions(bankId);

    const res = await fetch(`/api/questions?bankId=${bankId}`);
    const data = await res.json();

    setBankQuestions(prev => ({
      ...prev,
      [bankId]: data.questions || []
    }));

  } catch {
    toast.error("Failed to load questions");
  } finally {
    setLoadingQuestions(null);
  }
};
const toggleQuestion = (questionId: string) => {
  setQuiz(prev => ({
    ...prev,
    questionIds: prev.questionIds.includes(questionId)
      ? prev.questionIds.filter(id => id !== questionId)
      : [...prev.questionIds, questionId],
  }));
};
const importFullBank = (bankId: string) => {
  setQuiz(prev => ({
    ...prev,
    bankIds: prev.bankIds.includes(bankId)
      ? prev.bankIds.filter(id => id !== bankId)
      : [...prev.bankIds, bankId],
  }));
};
  /* ───────── UI ───────── */

  return (
    <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-8">

      {/* LEFT SIDE — QUIZ SETTINGS */}
      <Card>
        <CardContent className="space-y-5 p-6">

          <h2 className="text-xl font-semibold">
            Quiz Settings
          </h2>

          <Input
            placeholder="Quiz Title"
            value={quiz.title}
            onChange={(e) =>
              setQuiz((prev) => ({
                ...prev,
                title: e.target.value,
              }))
            }
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

          {/* <div className="flex items-center justify-between">
            <span>Randomize Questions</span>
            <Switch
              checked={quiz.randomizeQuestions}
              onCheckedChange={(v) =>
                setQuiz((prev) => ({
                  ...prev,
                  randomizeQuestions: v,
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between">
            <span>Randomize Options</span>
            <Switch
              checked={quiz.randomizeOptions}
              onCheckedChange={(v) =>
                setQuiz((prev) => ({
                  ...prev,
                  randomizeOptions: v,
                }))
              }
            />
          </div> */}

          <Button
            disabled={saving}
            onClick={handleSave}
            className="w-full bg-black text-white"
          >
            {saving ? "Saving..." : "Save Quiz"}
          </Button>

        </CardContent>
      </Card>

      {/* RIGHT SIDE — QUESTION BANKS */}
      <Card className="h-[600px] flex flex-col">
        <CardContent className="p-6 flex flex-col h-full">

          <h2 className="text-xl font-semibold mb-4">
            Question Banks
          </h2>

          <SearchBar
            data={banks}
            keys={["title"]}
            onResults={setFilteredBanks}
            placeholder="Search question banks..."
          />

          <div className="mt-5 flex-1 overflow-y-auto pr-2 space-y-3">

            {loadingBanks && (
              <p className="text-sm text-muted-foreground">
                Loading banks...
              </p>
            )}

            {!loadingBanks && filteredBanks.length === 0 && (
              <p className="text-sm text-muted-foreground">
                No banks found
              </p>
            )}

            {filteredBanks.map((bank) => {
  const selected = quiz.bankIds.includes(bank.id);
  const isOpen = openBanks.includes(bank.id);
  const questions = bankQuestions[bank.id] || [];

  return (
    <div
      key={bank.id}
      className="rounded-xl border transition-all"
    >
      {/* BANK HEADER */}
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
            className={`${isOpen?"bg-orange-300":"bg-blue-300"}`}
          >
            {isOpen ? "Hide" : "View"}
          </Button>
        </div>
      </div>

      {/* EXPANDED QUESTIONS */}
      {isOpen && (
        <div className="border-t bg-slate-50 px-4 py-3 space-y-2 max-h-60 overflow-y-auto">
          {loadingQuestions === bank.id && (
            <p className="text-xs text-muted-foreground">
              Loading questions...
            </p>
          )}

          {questions.map((q: any) => {
            const checked = quiz.questionIds.includes(q.id);

            return (
              <label
                key={q.id}
                className="flex items-center gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggleQuestion(q.id)}
                />
                <span className="truncate">
                  {q.questionText}
                </span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
})}
          </div>

          <div className="pt-4 border-t mt-4 text-sm text-muted-foreground">
            Selected Banks: {quiz.bankIds.length}
          </div>

        </CardContent>
      </Card>
    </div>
  );
}
