"use client";

import { Badge } from "@/components/ui/badge";

export function AssignedCoursesCell({ courses }: { courses?: string[] }) {
  if (!courses?.length) {
    return <span className="text-slate-400">No courses assigned</span>;
  }

  return (
    <div className="flex flex-wrap gap-2">
      {courses.map((course) => (
        <Badge
          key={course}
          variant="outline"
          className="border-cyan-200 bg-cyan-50 text-cyan-700"
        >
          {course}
        </Badge>
      ))}
    </div>
  );
}
