"use client";

import { useEffect, useState } from "react";
import { BookOpen, Plus } from "lucide-react";
import { toast } from "sonner";
import { CourseAccessTierSwitch } from "@/components/dashboard/courses/CourseAccessTierSwitch";
import { CourseCard } from "@/components/dashboard/courses/CourseCard";
import { emptyCourseForm, type Course } from "@/components/dashboard/courses/types";
import { EmptyState } from "@/components/dashboard/shared/EmptyState";
import { SectionHeader } from "@/components/dashboard/shared/SectionHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { adminFetch } from "@/lib/client/adminApi";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState(emptyCourseForm);
  const [saving, setSaving] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await adminFetch("/api/courses");
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
      const res = await adminFetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create course");
      toast.success("Course created");
      setForm(emptyCourseForm);
      setDialogOpen(false);
      fetchCourses();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create course");
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateCourse = async (nextCourse: Course) => {
    if (!nextCourse.title.trim()) {
      toast.error("Course title is required");
      return;
    }

    try {
      const res = await adminFetch(`/api/courses/${nextCourse.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextCourse),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update course");
      toast.success("Course updated");
      await fetchCourses();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update course");
      throw error;
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await adminFetch(`/api/courses/${id}`, { method: "DELETE" });
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
        <SectionHeader
          eyebrow="Curriculum"
          title="Courses"
          description="Create top-level courses like FRCS Section 1 or FRCS Section 2, then build their internal sections and assign manual members where needed."
          actions={
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
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, title: event.target.value }))
                      }
                      placeholder="FRCS Section 1"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Sort order</Label>
                    <Input
                      type="number"
                      value={form.sortOrder}
                      onChange={(event) =>
                        setForm((prev) => ({
                          ...prev,
                          sortOrder:
                            event.target.value === "" ? "" : Number(event.target.value),
                        }))
                      }
                      placeholder="10"
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
                  <CourseAccessTierSwitch
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
          }
        />

        {loading ? (
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 text-sm text-slate-500">Loading courses...</CardContent>
          </Card>
        ) : courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses yet"
            description="Start by creating a course, then add its internal sections on the next screen."
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {courses.map((course) => (
              <CourseCard
                key={course.id}
                course={course}
                onDelete={handleDelete}
                onUpdate={handleUpdateCourse}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
