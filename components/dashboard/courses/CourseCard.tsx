"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, Edit3, Layers, Trash2, Users, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/dashboard/shared/ConfirmDialog";
import { CourseAccessBadge, CourseVisibilityBadge } from "./CourseStatusBadges";
import type { Course } from "./types";

export function CourseCard({
  course,
  onDelete,
  onUpdate,
}: {
  course: Course;
  onDelete: (id: string) => void;
  onUpdate: (course: Course) => Promise<void> | void;
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(course.title);
  const [sortOrder, setSortOrder] = useState(
    typeof course.sortOrder === "number" ? String(course.sortOrder) : ""
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(course.title);
    setSortOrder(typeof course.sortOrder === "number" ? String(course.sortOrder) : "");
  }, [course]);

  const cancelEdit = () => {
    setTitle(course.title);
    setSortOrder(typeof course.sortOrder === "number" ? String(course.sortOrder) : "");
    setIsEditing(false);
  };

  const saveEdit = async () => {
    const nextTitle = title.trim();
    if (!nextTitle) return;

    setSaving(true);
    try {
      await onUpdate({
        ...course,
        title: nextTitle,
        sortOrder: sortOrder.trim() ? Number(sortOrder) : null,
      });
      setIsEditing(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
              <Layers className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              {isEditing ? (
                <div className="grid gap-2 sm:grid-cols-[1fr_96px]">
                  <Input
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    className="h-9"
                    aria-label="Course name"
                  />
                  <Input
                    type="number"
                    value={sortOrder}
                    onChange={(event) => setSortOrder(event.target.value)}
                    className="h-9"
                    aria-label="Course sort order"
                    placeholder="Order"
                  />
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-lg font-semibold text-slate-900">{course.title}</p>
                  {typeof course.sortOrder === "number" ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-500">
                      Order {course.sortOrder}
                    </span>
                  ) : null}
                </div>
              )}
              <div className="mt-2 flex flex-wrap gap-2">
                <CourseAccessBadge accessTier={course.accessTier} />
                <CourseVisibilityBadge showOnApp={course.showOnApp} />
              </div>
              <p className="mt-2 line-clamp-3 text-sm leading-6 text-slate-500">
                {course.description || "No description added yet."}
              </p>
              <p className="mt-3 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                {Array.isArray(course.sections) ? course.sections.length : 0} sections
              </p>
              <p className="mt-1 flex items-center gap-1 text-xs text-slate-500">
                <Users className="h-3.5 w-3.5" />
                {(course.memberUserIds || []).length} member(s)
              </p>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {isEditing ? (
              <>
                <button
                  type="button"
                  onClick={saveEdit}
                  disabled={saving || !title.trim()}
                  className="rounded-xl border border-emerald-200 p-2 text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Save course"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={cancelEdit}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  aria-label="Cancel edit"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => setIsEditing(true)}
                className="rounded-xl border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50"
                aria-label="Edit course"
              >
                <Edit3 className="h-4 w-4" />
              </button>
            )}

            <ConfirmDialog
              title="Delete course?"
              description="This will remove the course shell and all its sections."
              confirmLabel="Delete Course"
              destructive
              onConfirm={() => onDelete(course.id)}
              trigger={
                <button
                  type="button"
                  className="rounded-xl border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                  aria-label="Delete course"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              }
            />
          </div>
        </div>

        <Button asChild variant="outline" className="mt-5 w-full justify-between border-slate-200">
          <Link href={`/dashboard/curriculum/courses/${course.id}`}>
            Manage Sections
            <ChevronRight className="h-4 w-4" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
