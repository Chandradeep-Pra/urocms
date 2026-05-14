"use client";

import Link from "next/link";
import { ChevronRight, Layers, Trash2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/dashboard/shared/ConfirmDialog";
import { CourseAccessBadge, CourseVisibilityBadge } from "./CourseStatusBadges";
import type { Course } from "./types";

export function CourseCard({
  course,
  onDelete,
}: {
  course: Course;
  onDelete: (id: string) => void;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-cyan-50 text-cyan-700">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <p className="text-lg font-semibold text-slate-900">{course.title}</p>
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
              >
                <Trash2 className="h-4 w-4" />
              </button>
            }
          />
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
