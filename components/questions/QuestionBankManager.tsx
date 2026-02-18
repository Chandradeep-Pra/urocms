"use client";

import { useEffect, useState } from "react";
import { Plus, BookOpen, Pencil, Trash2, ArrowBigRightDash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export interface QuestionBank {
  id: string;
  title: string;
  section: "section1" | "section2";
  questionCount: number;
  createdAt?: any;
}

interface QuestionBankManagerProps {
  banks: QuestionBank[];
  setBanks: React.Dispatch<React.SetStateAction<QuestionBank[]>>;
  fetchBanks: () => Promise<void>;
}

export default function QuestionBankManager({banks, setBanks, fetchBanks}: QuestionBankManagerProps) {
  const [loading, setLoading] = useState(true);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const router = useRouter();

  const [form, setForm] = useState({
    title: "",
    section: "section1" as "section1" | "section2",
  });

  

  /* ───────── CREATE OR UPDATE ───────── */
  async function handleSave() {
    if (!form.title) {
      toast.error("Bank title required");
      return;
    }

    try {
      if (editId) {
        await fetch(`/api/question-banks/${editId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        toast.success("Bank updated");
      } else {
        await fetch("/api/question-banks", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        });
        toast.success("Bank created");
      }

      setDialogOpen(false);
      setEditId(null);
      setForm({ title: "", section: "section1" });
      fetchBanks();

    } catch {
      toast.error("Operation failed");
    }
  }

  /* ───────── DELETE ───────── */
  async function handleDelete(id: string) {
    try {
      await fetch(`/api/question-banks/${id}`, {
        method: "DELETE",
      });
      toast.success("Bank deleted");
      fetchBanks();
    } catch {
      toast.error("Delete failed");
    }
  }

  /* ───────── OPEN EDIT ───────── */
  function openEdit(bank: QuestionBank) {
    setForm({
      title: bank.title,
      section: bank.section,
    });
    setEditId(bank.id);
    setDialogOpen(true);
  }

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Question Banks</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Organize questions by section & chapter
          </p>
        </div>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-teal-600 hover:bg-teal-700 text-white shadow-md">
              <Plus className="h-4 w-4 mr-2" />
              Create Bank
            </Button>
          </DialogTrigger>

          <DialogContent className="rounded-2xl border p-0 overflow-hidden">

            <div className="px-6 py-5 border-b bg-slate-50">
              <DialogHeader>
                <DialogTitle>
                  {editId ? "Edit Question Bank" : "Create Question Bank"}
                </DialogTitle>
              </DialogHeader>
            </div>

            <div className="px-6 py-6 space-y-6">

              <div className="space-y-2">
                <Label>Bank Title</Label>
                <Input
                  value={form.title}
                  onChange={(e) =>
                    setForm({ ...form, title: e.target.value })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Section</Label>
                <Select
                  value={form.section}
                  onValueChange={(v: any) =>
                    setForm({ ...form, section: v })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="section1">
                      Section 1
                    </SelectItem>
                    <SelectItem value="section2">
                      Section 2
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Button
                onClick={handleSave}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white"
              >
                {editId ? "Update Bank" : "Create Bank"}
              </Button>

            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* BANK LIST */}
      <div className="grid md:grid-cols-3 gap-6">
        {banks.map((bank) => {
          const expanded = expandedId === bank.id;
          const isSection1 = bank.section === "section1";

          return (
            <Card
              key={bank.id}
              className="p-6 rounded-3xl border hover:shadow-xl transition-all cursor-pointer"
              onClick={() =>
                setExpandedId(expanded ? null : bank.id)
              }
            >
              <div className="flex items-start justify-between">

                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isSection1
                        ? "bg-teal-100 text-teal-700"
                        : "bg-indigo-100 text-indigo-700"
                    }`}
                  >
                    <BookOpen className="h-5 w-5" />
                  </div>

                  <div>
                    <h3 className="font-semibold">
                      {bank.title}
                    </h3>

                    <Badge
                      variant="outline"
                      className="mt-1 text-xs"
                    >
                      {bank.section === "section1"
                        ? "Section 1"
                        : "Section 2"}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* STATS */}
              <div className="mt-6 flex justify-between">
                <span className="text-xs text-muted-foreground">
                  Questions
                </span>
                <span className="text-lg font-semibold">
                  {bank.questionCount}
                </span>
              </div>

              {/* EXPANDED AREA */}
              {expanded && (
                <div className="mt-6 pt-6 border-t space-y-3">
                  <p className="text-xs text-muted-foreground">
                    Bank ID: {bank.id}
                  </p>

                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(bank);
                      }}
                    >
                      <Pencil className="h-4 w-4 mr-1" />
                      Edit
                    </Button>

                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(bank.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                    <Button
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/dashboard/content/questions/${bank.id}`);
                      }}
                    >
                      <ArrowBigRightDash className="h-4 w-4" />
                    </Button>

                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
