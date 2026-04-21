"use client";

import { Loader2, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { VivaCaseForm } from "@/components/viva/types";

interface FastAndFuriousDialogProps {
  open: boolean;
  form: VivaCaseForm;
  uploadingQuestionIndex: number | null;
  onOpenChange: (open: boolean) => void;
  onQuestionCountChange: (count: number) => void;
  onQuestionTextChange: (questionIndex: number, value: string) => void;
  onToggleQuestionImage: (questionIndex: number) => void;
  onQuestionImageUpload: (
    e: React.ChangeEvent<HTMLInputElement>,
    questionIndex: number
  ) => void;
  onQuestionImageLabelChange: (questionIndex: number, value: string) => void;
  onQuestionImageUrlChange: (questionIndex: number, value: string) => void;
  onQuestionImageDescriptionChange: (
    questionIndex: number,
    value: string
  ) => void;
  onQuestionImageRemove: (questionIndex: number) => void;
}

export function FastAndFuriousDialog({
  open,
  form,
  uploadingQuestionIndex,
  onOpenChange,
  onQuestionCountChange,
  onQuestionTextChange,
  onToggleQuestionImage,
  onQuestionImageUpload,
  onQuestionImageLabelChange,
  onQuestionImageUrlChange,
  onQuestionImageDescriptionChange,
  onQuestionImageRemove,
}: FastAndFuriousDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle>⚡ Fast and Furious</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-2">
            <Label htmlFor="fast-question-count" className="text-sm font-semibold text-slate-800">
              🔢 Number of Questions
            </Label>
            <Input
              id="fast-question-count"
              type="number"
              min={1}
              value={form.fastAndFurious.questionCount}
              onChange={(e) => onQuestionCountChange(Number(e.target.value || 1))}
            />
          </div>

          <div className="space-y-4">
            {form.fastAndFurious.questions.map((question, index) => (
              <div
                key={question.id}
                className="rounded-2xl border border-slate-200 bg-white p-4 space-y-4 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-slate-800">❓ Question {index + 1}</h4>
                  </div>

                  <Button
                    type="button"
                    variant={question.imageEnabled ? "default" : "outline"}
                    className={question.imageEnabled ? "bg-teal-600 text-white hover:bg-teal-700" : ""}
                    onClick={() => onToggleQuestionImage(index)}
                  >
                    {question.imageEnabled ? "🗑 Remove Image" : "🖼 Add Image"}
                  </Button>
                </div>

                <Textarea
                  placeholder={`Enter question ${index + 1}`}
                  value={question.question}
                  onChange={(e) => onQuestionTextChange(index, e.target.value)}
                  className="min-h-[96px] rounded-xl bg-slate-50 border-slate-200"
                />

                {question.imageEnabled && (
                  <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-4">
                    <Input
                      placeholder="Image name"
                      value={question.image.imageName}
                      onChange={(e) =>
                        onQuestionImageLabelChange(index, e.target.value)
                      }
                      className="bg-white"
                    />

                    <div className="space-y-2">
                      <Label className="text-xs font-semibold">🖼 Upload Image</Label>
                      <label className="block">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => onQuestionImageUpload(e, index)}
                          disabled={uploadingQuestionIndex === index}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full"
                          disabled={uploadingQuestionIndex === index}
                          onClick={(e) => {
                            e.preventDefault();
                            (
                              e.currentTarget.parentElement?.querySelector(
                                'input[type="file"]'
                              ) as HTMLInputElement
                            )?.click();
                          }}
                        >
                          {uploadingQuestionIndex === index ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Uploading...
                            </>
                          ) : (
                            <>
                              <Upload className="mr-2 h-4 w-4" />
                              Choose Image
                            </>
                          )}
                        </Button>
                      </label>
                    </div>

                    {question.image.imageUrl && (
                      <div className="relative group">
                        <img
                          src={question.image.imageUrl}
                          alt={question.image.imageName || `Question ${index + 1} preview`}
                          className="w-full h-40 object-cover rounded border border-slate-200"
                        />
                        <button
                          type="button"
                          onClick={() => onQuestionImageRemove(index)}
                          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    )}

                    <Input
                      placeholder="Or paste image URL manually"
                      value={question.image.imageUrl}
                      onChange={(e) =>
                        onQuestionImageUrlChange(index, e.target.value)
                      }
                      className="bg-white"
                    />

                    <Textarea
                      placeholder="Image description"
                      value={question.image.imageDesc}
                      onChange={(e) =>
                        onQuestionImageDescriptionChange(index, e.target.value)
                      }
                      className="min-h-[88px] bg-white"
                    />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button
            type="button"
            className="bg-teal-600 text-white hover:bg-teal-700"
            onClick={() => onOpenChange(false)}
          >
            Save
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
