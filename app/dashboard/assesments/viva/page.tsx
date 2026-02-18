"use client"

import { useState } from "react";
import { Plus, Brain, Eye, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";

interface VivaCase {
  id: string;
  caseText: string;
  explanation: string;
  hasImage: boolean;
}

const mockCases: VivaCase[] = [
  { id: "1", caseText: "A 65-year-old male presents with painless gross hematuria for 2 days. He is a chronic smoker with 40 pack-year history. Ultrasound shows a 3cm papillary mass in the bladder.", explanation: "This is a classic presentation of bladder transitional cell carcinoma. Key features: painless hematuria, smoking history. Next steps: cystoscopy with biopsy, CT urogram.", hasImage: false },
  { id: "2", caseText: "A 45-year-old female presents with recurrent UTIs and right flank pain. CT KUB shows a 15mm stone in the right renal pelvis with mild hydronephrosis.", explanation: "Staghorn calculus or large renal pelvic stone requiring intervention. Options: PCNL for stones >2cm, ESWL for smaller stones.", hasImage: true },
  { id: "3", caseText: "A newborn male has bilateral non-palpable testes. Physical examination shows hyperpigmented scrotum and midline fusion.", explanation: "Consider congenital adrenal hyperplasia (CAH) in a virilized genetic female (46,XX DSD). Urgent serum 17-OHP and karyotype needed.", hasImage: false },
];

const AIVivaPage = () => {
  const [cases, setCases] = useState(mockCases);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({ caseText: "", explanation: "" });

  const handleSave = () => {
    if (!form.caseText) { toast.error("Case text required"); return; }
    setCases((prev) => [...prev, { id: Date.now().toString(), ...form, hasImage: false }]);
    setDialogOpen(false);
    setForm({ caseText: "", explanation: "" });
    toast.success("Viva case added");
  };

  const handleDelete = () => {
    if (deleteId) {
      setCases((prev) => prev.filter((c) => c.id !== deleteId));
      setDeleteId(null);
      toast.success("Case deleted");
    }
  };

  const previewCase = cases.find((c) => c.id === previewId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{cases.length} viva cases</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogTrigger asChild>
    <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-sm">
      <Plus className="mr-2 h-4 w-4" />
      Add Case
    </Button>
  </DialogTrigger>

  <DialogContent className="max-w-3xl rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden">

    {/* HEADER */}
    <div className="px-6 py-6 border-b border-slate-100 bg-slate-50">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-slate-800">
          Create AI Viva Case
        </DialogTitle>
        <p className="text-sm text-slate-500 mt-1">
          Add a structured clinical scenario with model explanation.
        </p>
      </DialogHeader>
    </div>

    {/* BODY */}
    <div className="px-6 py-6 space-y-6">

      {/* Case Section */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">
          Clinical Scenario
        </Label>

        <Textarea
          value={form.caseText}
          onChange={(e) =>
            setForm({ ...form, caseText: e.target.value })
          }
          placeholder="Example: A 56-year-old gentleman presents with painless hematuria..."
          rows={6}
          className="border-slate-200 focus:border-teal-500 focus:ring-teal-500 resize-none"
        />

        <p className="text-xs text-slate-500">
          Describe patient presentation, history, findings, and relevant investigations.
        </p>
      </div>

      {/* Explanation Section */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">
          Model Answer & Key Points
        </Label>

        <Textarea
          value={form.explanation}
          onChange={(e) =>
            setForm({ ...form, explanation: e.target.value })
          }
          placeholder="Outline diagnosis, differentials, investigations, and management plan..."
          rows={6}
          className="border-slate-200 focus:border-teal-500 focus:ring-teal-500 resize-none"
        />

        <p className="text-xs text-slate-500">
          This will guide AI viva responses and student evaluation.
        </p>
      </div>

    </div>

    {/* FOOTER */}
    <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
      
      <Button
        variant="ghost"
        onClick={() => setDialogOpen(false)}
        className="text-slate-600 hover:text-slate-800"
      >
        Cancel
      </Button>

      <Button
        onClick={handleSave}
        className="bg-teal-600 hover:bg-teal-700 text-white px-6 shadow-sm"
      >
        Save Case
      </Button>

    </div>
  </DialogContent>
</Dialog>

      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {cases.map((c) => (
          <Card key={c.id} className="shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-primary/10 p-2 mt-0.5">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground line-clamp-3">{c.caseText}</p>
                  <div className="mt-3 flex gap-1">
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground" onClick={() => setPreviewId(c.id)}>
                      <Eye className="mr-1 h-3.5 w-3.5" /> Preview
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-foreground">
                      <Edit className="mr-1 h-3.5 w-3.5" /> Edit
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-muted-foreground hover:text-destructive" onClick={() => setDeleteId(c.id)}>
                      <Trash2 className="mr-1 h-3.5 w-3.5" /> Delete
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Preview Dialog */}
      <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>Case Preview</DialogTitle></DialogHeader>
          {previewCase && (
            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h4 className="text-sm font-semibold text-primary mb-2">Clinical Scenario</h4>
                <p className="text-sm text-foreground leading-relaxed">{previewCase.caseText}</p>
              </div>
              <div className="rounded-lg border border-accent/30 bg-accent/5 p-4">
                <h4 className="text-sm font-semibold text-accent mb-2">Model Answer</h4>
                <p className="text-sm text-foreground leading-relaxed">{previewCase.explanation}</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Case</AlertDialogTitle><AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default AIVivaPage;
