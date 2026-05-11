"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { BookOpen, ChevronRight, Layers, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type AccessTier = "free" | "paid";

type Course = {
  id: string;
  title: string;
  description?: string;
  slug?: string;
  accessTier?: AccessTier;
  showOnApp?: boolean;
  sections?: Array<unknown>;
};

const emptyForm = {
  title: "",
  description: "",
  accessTier: "free" as AccessTier,
  showOnApp: false,
};

function AccessTierSwitch({
  value,
  onChange,
}: {
  value: AccessTier;
  onChange: (value: AccessTier) => void;
}) {
  const isPaid = value === "paid";

  return (
    <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">Course Access</p>
        <p className="text-xs text-slate-500">
          Toggle this course between free access and paid access.
        </p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={isPaid}
        onClick={() => onChange(isPaid ? "free" : "paid")}
        className={`inline-flex min-w-[112px] items-center justify-center rounded-full px-4 py-2 text-sm font-semibold transition ${
          isPaid
            ? "bg-amber-100 text-amber-800 ring-1 ring-amber-200"
            : "bg-emerald-100 text-emerald-800 ring-1 ring-emerald-200"
        }`}
      >
        {isPaid ? "Paid" : "Free"}
      </button>
    </div>
  );
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/courses", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch courses");
      setCourses(data.courses || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  const handleCreate = async () => {
    if (!form.title.trim()) {
      toast.error("Course title is required");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create course");
      toast.success("Course created");
      setForm(emptyForm);
      setDialogOpen(false);
      fetchCourses();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    const confirmed = window.confirm("Delete this course? This will remove the course shell and all its sections.");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/courses/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete course");
      toast.success("Course deleted");
      fetchCourses();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete course");
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-600">
              Curriculum
            </p>
            <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
              Courses
            </h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              Create top-level courses like FRCS Section 1 or FRCS Section 2, then build their internal sections.
            </p>
          </div>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-600 text-white hover:bg-cyan-700">
                <Plus className="mr-2 h-4 w-4" />
                Create Course
              </Button>
            </DialogTrigger>
            <DialogContent className="rounded-3xl">
              <DialogHeader>
                <DialogTitle>Create course</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Course title</Label>
                  <Input
                    value={form.title}
                    onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="FRCS Section 1"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea
                    value={form.description}
                    onChange={(event) =>
                      setForm((prev) => ({ ...prev, description: event.target.value }))
                    }
                    placeholder="Main curriculum container for FRCS Urology Section 1."
                    className="min-h-[120px]"
                  />
                </div>
                <AccessTierSwitch
                  value={form.accessTier}
                  onChange={(value) => setForm((prev) => ({ ...prev, accessTier: value }))}
                />
                <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Show on app</p>
                    <p className="text-xs text-slate-500">
                      Keep this off until the course is ready for learners.
                    </p>
                  </div>
                  <Switch
                    checked={form.showOnApp}
                    onCheckedChange={(checked) =>
                      setForm((prev) => ({ ...prev, showOnApp: checked }))
                    }
                  />
                </div>
                <Button onClick={handleCreate} disabled={saving} className="w-full">
                  {saving ? "Creating..." : "Create Course"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {loading ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 text-sm text-slate-500">Loading courses...</CardContent>
          </Card>
        ) : courses.length === 0 ? (
          <Card className="border-dashed border-slate-200 shadow-sm">
            <CardContent className="p-10 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
                <BookOpen className="h-6 w-6" />
              </div>
              <h2 className="mt-4 text-lg font-semibold text-slate-900">No courses yet</h2>
              <p className="mt-2 text-sm text-slate-500">
                Start by creating a course, then add its internal sections on the next screen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <Card key={course.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
                        <Layers className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-lg font-semibold text-slate-900">{course.title}</p>
                        <div className="mt-2">
                          <div className="flex flex-wrap gap-2">
                            <Badge
                              variant="outline"
                              className={
                                course.accessTier === "paid"
                                  ? "border-amber-200 bg-amber-50 text-amber-700"
                                  : "border-emerald-200 bg-emerald-50 text-emerald-700"
                              }
                            >
                              {course.accessTier === "paid" ? "Paid Course" : "Free Course"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                course.showOnApp
                                  ? "border-cyan-200 bg-cyan-50 text-cyan-700"
                                  : "border-slate-200 bg-slate-100 text-slate-600"
                              }
                            >
                              {course.showOnApp ? "Visible On App" : "Hidden From App"}
                            </Badge>
                          </div>
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                          {course.description || "No description added yet."}
                        </p>
                        <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                          {Array.isArray(course.sections) ? course.sections.length : 0} sections
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDelete(course.id)}
                      className="rounded-xl border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <Button asChild variant="outline" className="mt-5 w-full justify-between border-slate-200">
                    <Link href={`/dashboard/curriculum/courses/${course.id}`}>
                      Manage Sections
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
