"use client";

import { useState } from "react";
import { CheckCircle2, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { QuestionBank } from "./QuestionBankManager";

interface ContentBlock {
  text?: string;
  image?: string;
}

interface QuestionForm {
  bankId: string;
  question: ContentBlock;
  options: string[];
  correctAnswer: number;
  explanation: ContentBlock;
}

interface Props {
  banks: QuestionBank[];
  setBanks: React.Dispatch<React.SetStateAction<QuestionBank[]>>;
}

export default function QuestionCreator({ banks, setBanks }: Props) {
  const [form, setForm] = useState<QuestionForm>({
    bankId: "",
    question: { text: "", image: "" },
    options: ["", "", "", ""],
    correctAnswer: 0,
    explanation: { text: "", image: "" },
  });

  const [loading, setLoading] = useState(false);

const saveQuestion = async () => {
  if (!form.bankId || !form.question.text.trim()) {
    toast.error("Bank & Question text are required");
    return;
  }

  if (form.options.some((o) => !o.trim())) {
    toast.error("All options must be filled");
    return;
  }

  try {
    setLoading(true);

    const res = await fetch("/api/questions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        bankId: form.bankId,
        questionText: form.question.text,
        questionImage: form.question.image,
        options: form.options,
        correctAnswer: form.correctAnswer,
        explanation: form.explanation,
      }),
    });

    if (!res.ok) {
      throw new Error("Failed to create question");
    }

    const data = await res.json();

    // 🔥 update local bank question count
    setBanks((prev) =>
      prev.map((b) =>
        b.id === form.bankId
          ? { ...b, questionCount: b.questionCount + 1 }
          : b
      )
    );

    toast.success("✨ Question saved successfully");

    // reset form
    setForm({
      bankId: "",
      question: { text: "", image: "" },
      options: ["", "", "", ""],
      correctAnswer: 0,
      explanation: { text: "", image: "" },
    });

  } catch (err) {
    console.error(err);
    toast.error("Failed to save question");
  } finally {
    setLoading(false);
  }
};


  return (
    <Card className="rounded-3xl border border-slate-200 shadow-xl bg-gradient-to-br from-white to-slate-50">
      
      <CardHeader className="border-b bg-slate-50 rounded-t-3xl">
        <CardTitle className="text-xl font-semibold">
          Create Question
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Add MCQ with optional images in question & explanation.
        </p>
      </CardHeader>

      <CardContent className="space-y-8 p-8">

        {/* Select Bank */}
        <div className="space-y-2">
          <Label>Select Question Bank</Label>
          <Select
            value={form.bankId}
            onValueChange={(v) =>
              setForm({ ...form, bankId: v })
            }
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose bank" />
            </SelectTrigger>
            <SelectContent>
              {banks.map((b) => (
                <SelectItem key={b.id} value={b.id}>
                  {b.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Question Text */}
        <div className="space-y-2">
          <Label>Question Text</Label>
          <Textarea
            value={form.question.text}
            onChange={(e) =>
              setForm({
                ...form,
                question: {
                  ...form.question,
                  text: e.target.value,
                },
              })
            }
            placeholder="Enter full question..."
          />
        </div>

        {/* Question Image */}
        <div className="space-y-2">
          <Label>Question Image URL (optional)</Label>
          <Input
            placeholder="https://..."
            value={form.question.image}
            onChange={(e) =>
              setForm({
                ...form,
                question: {
                  ...form.question,
                  image: e.target.value,
                },
              })
            }
          />

          {form.question.image && (
            <div className="rounded-xl overflow-hidden border mt-3">
              <img
                src={form.question.image}
                alt="preview"
                className="w-full h-48 object-cover"
              />
            </div>
          )}
        </div>

        {/* Options */}
        <div>
          <Label>Answer Options</Label>
          <div className="mt-4 grid gap-4">
            {form.options.map((opt, i) => {
              const isCorrect = form.correctAnswer === i;

              return (
                <div
                  key={i}
                  className={`flex items-center gap-4 p-4 rounded-xl border transition
                    ${
                      isCorrect
                        ? "border-teal-500 bg-teal-50"
                        : "border-slate-200"
                    }`}
                >
                  <input
                    type="radio"
                    checked={isCorrect}
                    onChange={() =>
                      setForm({ ...form, correctAnswer: i })
                    }
                    className="accent-teal-600"
                  />

                  <Input
                    value={opt}
                    onChange={(e) => {
                      const updated = [...form.options];
                      updated[i] = e.target.value;
                      setForm({ ...form, options: updated });
                    }}
                    placeholder={`Option ${i + 1}`}
                  />

                  {isCorrect && (
                    <CheckCircle2 className="text-teal-600 h-4 w-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Explanation Text */}
        <div className="space-y-2">
          <Label>Explanation</Label>
          <Textarea
            value={form.explanation.text}
            onChange={(e) =>
              setForm({
                ...form,
                explanation: {
                  ...form.explanation,
                  text: e.target.value,
                },
              })
            }
            placeholder="Provide reasoning..."
          />
        </div>

        {/* Explanation Image */}
        <div className="space-y-2">
          <Label>Explanation Image URL (optional)</Label>
          <Input
            placeholder="https://..."
            value={form.explanation.image}
            onChange={(e) =>
              setForm({
                ...form,
                explanation: {
                  ...form.explanation,
                  image: e.target.value,
                },
              })
            }
          />

          {form.explanation.image && (
            <div className="rounded-xl overflow-hidden border mt-3">
              <img
                src={form.explanation.image}
                alt="preview"
                className="w-full h-48 object-cover"
              />
            </div>
          )}
        </div>

        {/* Save */}
        <Button
          onClick={saveQuestion}
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white py-3 rounded-xl"
        >
            {loading ? "Saving..." : "Save Question"}
        </Button>


      </CardContent>
    </Card>
  );
}
