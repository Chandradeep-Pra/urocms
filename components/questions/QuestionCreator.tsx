"use client";

import { useRef, useState } from "react";
import { CheckCircle2, ImageUp, Loader2, Trash2 } from "lucide-react";
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
import { adminFetch } from "@/lib/client/adminApi";
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

function createEmptyForm(bankId = ""): QuestionForm {
  return {
    bankId,
    question: { text: "", image: "" },
    options: ["", "", "", "", ""],
    correctAnswer: 0,
    explanation: { text: "", image: "" },
  };
}

export default function QuestionCreator({ banks, setBanks }: Props) {
  const questionImageInputRef = useRef<HTMLInputElement>(null);
  const explanationImageInputRef = useRef<HTMLInputElement>(null);

  const [selectedBankId, setSelectedBankId] = useState("");
  const [form, setForm] = useState<QuestionForm>(createEmptyForm());
  const [queuedQuestions, setQueuedQuestions] = useState<QuestionForm[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadingQuestionImage, setUploadingQuestionImage] = useState(false);
  const [uploadingExplanationImage, setUploadingExplanationImage] = useState(false);

  const selectedBank = banks.find((bank) => bank.id === selectedBankId) ?? null;

  async function uploadToCloudinary(file: File, folder: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", folder);

    const res = await fetch("/api/cloudinary-upload", {
      method: "POST",
      body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data?.url) {
      throw new Error(data?.error || "Upload failed");
    }

    return data.url as string;
  }

  async function handleQuestionImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Uploading question image...");
    setUploadingQuestionImage(true);

    try {
      const url = await uploadToCloudinary(file, "questions");
      setForm((prev) => ({
        ...prev,
        question: {
          ...prev.question,
          image: url,
        },
      }));
      toast.success("Question image uploaded", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Question image upload failed",
        { id: toastId }
      );
    } finally {
      setUploadingQuestionImage(false);
      if (questionImageInputRef.current) {
        questionImageInputRef.current.value = "";
      }
    }
  }

  async function handleExplanationImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    const toastId = toast.loading("Uploading explanation image...");
    setUploadingExplanationImage(true);

    try {
      const url = await uploadToCloudinary(file, "questions");
      setForm((prev) => ({
        ...prev,
        explanation: {
          ...prev.explanation,
          image: url,
        },
      }));
      toast.success("Explanation image uploaded", { id: toastId });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Explanation image upload failed",
        { id: toastId }
      );
    } finally {
      setUploadingExplanationImage(false);
      if (explanationImageInputRef.current) {
        explanationImageInputRef.current.value = "";
      }
    }
  }

  function validateCurrentQuestion() {
    if (!selectedBankId || !form.question.text?.trim()) {
      toast.error("Select a question bank and add question text");
      return false;
    }

    if (form.options.some((option) => !option.trim())) {
      toast.error("All options must be filled");
      return false;
    }

    return true;
  }

  function queueCurrentQuestion() {
    if (!validateCurrentQuestion()) return;

    setQueuedQuestions((prev) => [
      ...prev,
      {
        ...form,
        bankId: selectedBankId,
        question: { ...form.question },
        options: [...form.options],
        explanation: { ...form.explanation },
      },
    ]);

    setForm(createEmptyForm(selectedBankId));
    toast.success(
      `Question added to ${selectedBank?.title || "selected question bank"}`
    );
  }

  async function saveQueuedQuestions() {
    if (!selectedBankId) {
      toast.error("Select a question bank first");
      return;
    }

    if (queuedQuestions.length === 0) {
      toast.error("Add at least one question before saving");
      return;
    }

    try {
      setLoading(true);

      const res = await adminFetch("/api/questions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bankId: selectedBankId,
          questions: queuedQuestions.map((item) => ({
            questionText: item.question.text,
            questionImage: item.question.image,
            options: item.options,
            correctAnswer: item.correctAnswer,
            explanation: item.explanation,
          })),
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(data?.error || "Failed to create questions");
      }

      setBanks((prev) =>
        prev.map((bank) =>
          bank.id === selectedBankId
            ? { ...bank, questionCount: bank.questionCount + queuedQuestions.length }
            : bank
        )
      );

      toast.success(
        `Saved ${queuedQuestions.length} question${queuedQuestions.length === 1 ? "" : "s"} successfully`
      );

      setQueuedQuestions([]);
      setForm(createEmptyForm(selectedBankId));
    } catch (error) {
      console.error(error);
      toast.error(
        error instanceof Error ? error.message : "Failed to save questions"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 shadow-xl">
      <CardHeader className="rounded-t-3xl border-b bg-slate-50">
        <CardTitle className="text-xl font-semibold">Create Question</CardTitle>
        <p className="text-sm text-muted-foreground">
          Select a bank once, keep adding questions, then save the whole batch.
        </p>
      </CardHeader>

      <CardContent className="space-y-8 p-8">
        <div className="space-y-2">
          <Label>Select Question Bank</Label>
          <Select
            value={selectedBankId}
            onValueChange={(value) => {
              setSelectedBankId(value);
              setForm((prev) => ({ ...prev, bankId: value }));
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Choose bank" />
            </SelectTrigger>
            <SelectContent>
              {banks.map((bank) => (
                <SelectItem key={bank.id} value={bank.id}>
                  {bank.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedBank ? (
          <div className="rounded-2xl border border-teal-200 bg-teal-50 p-4">
            <p className="text-sm font-semibold text-teal-800">Selected bank</p>
            <div className="mt-2 flex items-center justify-between gap-4">
              <div>
                <p className="text-base font-semibold text-slate-900">{selectedBank.title}</p>
                <p className="text-xs text-slate-600">
                  Existing: {selectedBank.questionCount} questions
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                {queuedQuestions.length} queued
              </div>
            </div>
          </div>
        ) : null}

        <div className="space-y-2">
          <Label>Question Text</Label>
          <Textarea
            value={form.question.text}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                question: {
                  ...prev.question,
                  text: e.target.value,
                },
              }))
            }
            placeholder="Enter full question..."
          />
        </div>

        <div className="space-y-2">
          <Label>Question Image (optional)</Label>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Paste image URL or upload"
              value={form.question.image}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  question: {
                    ...prev.question,
                    image: e.target.value,
                  },
                }))
              }
            />
            <input
              ref={questionImageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleQuestionImageUpload}
              disabled={uploadingQuestionImage}
            />
            <Button
              className="cursor-pointer rounded-2xl bg-black p-3 text-white transition hover:bg-slate-800"
              type="button"
              variant="outline"
              disabled={uploadingQuestionImage}
              onClick={() => questionImageInputRef.current?.click()}
            >
              {uploadingQuestionImage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading
                </>
              ) : (
                <>
                  <ImageUp className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>

          {form.question.image ? (
            <div className="mt-3 overflow-hidden rounded-xl border">
              <img
                src={form.question.image}
                alt="preview"
                className="h-auto w-full object-cover"
              />
            </div>
          ) : null}
        </div>

        <div>
          <Label>Answer Options</Label>
          <div className="mt-4 grid gap-4">
            {form.options.map((option, index) => {
              const isCorrect = form.correctAnswer === index;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-4 rounded-xl border p-4 transition ${
                    isCorrect ? "border-teal-500 bg-teal-50" : "border-slate-200"
                  }`}
                >
                  <input
                    type="radio"
                    checked={isCorrect}
                    onChange={() =>
                      setForm((prev) => ({
                        ...prev,
                        correctAnswer: index,
                      }))
                    }
                    className="accent-teal-600"
                  />

                  <Input
                    value={option}
                    onChange={(e) => {
                      const updated = [...form.options];
                      updated[index] = e.target.value;
                      setForm((prev) => ({ ...prev, options: updated }));
                    }}
                    placeholder={`Option ${index + 1}`}
                  />

                  {isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-teal-600" />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <Label>Explanation</Label>
          <Textarea
            value={form.explanation.text}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                explanation: {
                  ...prev.explanation,
                  text: e.target.value,
                },
              }))
            }
            placeholder="Provide reasoning..."
          />
        </div>

        <div className="space-y-2">
          <Label>Explanation Image (optional)</Label>
          <div className="flex items-center gap-3">
            <Input
              placeholder="Paste image URL or upload"
              value={form.explanation.image}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  explanation: {
                    ...prev.explanation,
                    image: e.target.value,
                  },
                }))
              }
            />
            <input
              ref={explanationImageInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={handleExplanationImageUpload}
              disabled={uploadingExplanationImage}
            />
            <Button
              className="cursor-pointer rounded-2xl bg-black p-3 text-white transition hover:bg-slate-800"
              type="button"
              variant="outline"
              disabled={uploadingExplanationImage}
              onClick={() => explanationImageInputRef.current?.click()}
            >
              {uploadingExplanationImage ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading
                </>
              ) : (
                <>
                  <ImageUp className="mr-2 h-4 w-4" />
                  Upload
                </>
              )}
            </Button>
          </div>

          {form.explanation.image ? (
            <div className="mt-3 overflow-hidden rounded-xl border">
              <img
                src={form.explanation.image}
                alt="preview"
                className="h-auto w-full object-cover"
              />
            </div>
          ) : null}
        </div>

        {queuedQuestions.length > 0 ? (
          <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Queued Questions</p>
                <p className="text-xs text-slate-500">
                  Keep adding questions, then save the full batch together.
                </p>
              </div>
              <div className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                {queuedQuestions.length} total
              </div>
            </div>

            <div className="space-y-2">
              {queuedQuestions.map((item, index) => (
                <div
                  key={`${item.question.text}-${index}`}
                  className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900">
                      {index + 1}. {item.question.text}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Correct option: {item.correctAnswer + 1}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() =>
                      setQueuedQuestions((prev) =>
                        prev.filter((_, queuedIndex) => queuedIndex !== index)
                      )
                    }
                  >
                    <Trash2 className="h-4 w-4 text-rose-500" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button
            type="button"
            onClick={queueCurrentQuestion}
            disabled={loading}
            className="flex-1 rounded-xl bg-slate-900 py-3 text-white hover:bg-slate-800"
          >
            Add Question To Queue
          </Button>

          <Button
            type="button"
            onClick={saveQueuedQuestions}
            disabled={loading || queuedQuestions.length === 0}
            className="flex-1 rounded-xl bg-teal-600 py-3 text-white hover:bg-teal-700"
          >
            {loading
              ? "Saving..."
              : `Save ${queuedQuestions.length} Question${queuedQuestions.length === 1 ? "" : "s"} To Question Bank`}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
