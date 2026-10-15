"use client";

import { useEffect, useState } from "react";
import { format, parseISO } from "date-fns";
import { CalendarIcon, Pencil, Trash2, Plus, X, Check } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { adminFetch } from "@/lib/client/adminApi";

interface ExamSchedule {
  id: string;
  examName: string;
  examDate: string; // "YYYY-MM-DD"
}

const EMPTY_FORM = { examName: "", examDate: "" };

function formatDisplayDate(iso: string) {
  try {
    return format(parseISO(iso), "dd MMM yyyy");
  } catch {
    return iso;
  }
}

function isPast(iso: string) {
  try {
    return parseISO(iso) < new Date(new Date().setHours(0, 0, 0, 0));
  } catch {
    return false;
  }
}

export default function ExamsPage() {
  const [schedules, setSchedules] = useState<ExamSchedule[]>([]);
  const [loading, setLoading] = useState(true);

  // Add form
  const [form, setForm] = useState(EMPTY_FORM);
  const [addDateOpen, setAddDateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Edit dialog
  const [editTarget, setEditTarget] = useState<ExamSchedule | null>(null);
  const [editForm, setEditForm] = useState(EMPTY_FORM);
  const [editDateOpen, setEditDateOpen] = useState(false);
  const [updating, setUpdating] = useState(false);

  // Delete dialog
  const [deleteTarget, setDeleteTarget] = useState<ExamSchedule | null>(null);
  const [deleting, setDeleting] = useState(false);

  // ── Fetch ────────────────────────────────────────────────────────────────────
  async function fetchSchedules() {
    try {
      setLoading(true);
      const res = await adminFetch("/api/exam-schedules");
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to fetch schedules");
      setSchedules(data.schedules || []);
    } catch (err: any) {
      toast.error(err.message || "Failed to load exam schedules");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchSchedules();
  }, []);

  // ── Add ──────────────────────────────────────────────────────────────────────
  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!form.examName.trim()) return toast.warning("Exam name is required");
    if (!form.examDate) return toast.warning("Exam date is required");

    try {
      setSubmitting(true);
      const res = await adminFetch("/api/exam-schedules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to add schedule");
      toast.success("Exam schedule added");
      setForm(EMPTY_FORM);
      await fetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to add exam schedule");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  function openEdit(schedule: ExamSchedule) {
    setEditTarget(schedule);
    setEditForm({ examName: schedule.examName, examDate: schedule.examDate });
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    if (!editForm.examName.trim()) return toast.warning("Exam name is required");
    if (!editForm.examDate) return toast.warning("Exam date is required");

    try {
      setUpdating(true);
      const res = await adminFetch(`/api/exam-schedules/${editTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to update schedule");
      toast.success("Exam schedule updated");
      setEditTarget(null);
      setEditForm(EMPTY_FORM);
      await fetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to update exam schedule");
    } finally {
      setUpdating(false);
    }
  }

  // ── Delete ───────────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const res = await adminFetch(`/api/exam-schedules/${deleteTarget.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to delete schedule");
      toast.success("Exam schedule deleted");
      setDeleteTarget(null);
      await fetchSchedules();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete exam schedule");
    } finally {
      setDeleting(false);
    }
  }

  // ── Helpers ──────────────────────────────────────────────────────────────────
  function dateToISO(date: Date | undefined): string {
    if (!date) return "";
    return format(date, "yyyy-MM-dd");
  }

  function isoToDate(iso: string): Date | undefined {
    if (!iso) return undefined;
    try {
      return parseISO(iso);
    } catch {
      return undefined;
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Exam Schedules</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage upcoming exam dates visible to all users.
        </p>
      </div>

      {/* ── Add form ── */}
      <form
        onSubmit={handleAdd}
        className="rounded-2xl border bg-white p-6 shadow-sm"
      >
        <h2 className="mb-4 text-base font-semibold text-slate-800">
          Add New Schedule
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_220px_auto]">
          {/* Exam Name */}
          <div className="space-y-1.5">
            <Label htmlFor="examName">Exam Name</Label>
            <Input
              id="examName"
              placeholder="e.g. FRCS Part 1"
              value={form.examName}
              onChange={(e) => setForm((f) => ({ ...f, examName: e.target.value }))}
            />
          </div>

          {/* Exam Date */}
          <div className="space-y-1.5">
            <Label>Select Exam Date</Label>
            <Popover open={addDateOpen} onOpenChange={setAddDateOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !form.examDate && "text-muted-foreground"
                  )}
                  type="button"
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {form.examDate ? formatDisplayDate(form.examDate) : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={isoToDate(form.examDate)}
                  onSelect={(date) => {
                    setForm((f) => ({ ...f, examDate: dateToISO(date) }));
                    setAddDateOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Submit */}
          <div className="flex items-end">
            <Button type="submit" disabled={submitting} className="w-full sm:w-auto">
              <Plus className="mr-1.5 h-4 w-4" />
              {submitting ? "Adding..." : "Add"}
            </Button>
          </div>
        </div>
      </form>

      {/* ── Schedule Table ── */}
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="border-b px-6 py-4">
          <h2 className="text-base font-semibold text-slate-800">
            All Schedules
            <span className="ml-2 text-sm font-normal text-slate-400">
              ({schedules.length})
            </span>
          </h2>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16 text-sm text-slate-500">
            Loading schedules...
          </div>
        ) : schedules.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-slate-500">
            <CalendarIcon className="h-8 w-8 text-slate-300" />
            <p>No exam schedules yet. Add one above.</p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Exam Name</TableHead>
                <TableHead>Exam Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="pr-6 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {schedules.map((schedule) => (
                <TableRow key={schedule.id}>
                  <TableCell className="pl-6 font-medium text-slate-900">
                    {schedule.examName}
                  </TableCell>
                  <TableCell className="text-slate-600">
                    {formatDisplayDate(schedule.examDate)}
                  </TableCell>
                  <TableCell>
                    {isPast(schedule.examDate) ? (
                      <Badge variant="secondary">Completed</Badge>
                    ) : (
                      <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">
                        Upcoming
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    <div className="inline-flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => openEdit(schedule)}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span className="ml-1.5">Edit</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => setDeleteTarget(schedule)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span className="ml-1.5">Delete</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* ── Edit Dialog ── */}
      <Dialog
        open={!!editTarget}
        onOpenChange={(open) => {
          if (!open) {
            setEditTarget(null);
            setEditForm(EMPTY_FORM);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Exam Schedule</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleEdit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <Label htmlFor="editExamName">Exam Name</Label>
              <Input
                id="editExamName"
                placeholder="e.g. FRCS Part 1"
                value={editForm.examName}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, examName: e.target.value }))
                }
              />
            </div>

            <div className="space-y-1.5">
              <Label>Select Exam Date</Label>
              <Popover open={editDateOpen} onOpenChange={setEditDateOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !editForm.examDate && "text-muted-foreground"
                    )}
                    type="button"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {editForm.examDate
                      ? formatDisplayDate(editForm.examDate)
                      : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={isoToDate(editForm.examDate)}
                    onSelect={(date) => {
                      setEditForm((f) => ({ ...f, examDate: dateToISO(date) }));
                      setEditDateOpen(false);
                    }}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setEditTarget(null)}
                disabled={updating}
              >
                <X className="mr-1.5 h-4 w-4" />
                Cancel
              </Button>
              <Button type="submit" disabled={updating}>
                <Check className="mr-1.5 h-4 w-4" />
                {updating ? "Saving..." : "Save Changes"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm Dialog ── */}
      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Exam Schedule</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold text-slate-900">
                {deleteTarget?.examName}
              </span>{" "}
              scheduled for{" "}
              {deleteTarget ? formatDisplayDate(deleteTarget.examDate) : ""}?
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}