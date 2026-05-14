"use client";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Course, CourseMemberUser } from "./types";

export function CourseMemberPicker({
  course,
  memberCatalog,
  memberSearch,
  onSearchChange,
  onToggleMember,
}: {
  course: Course;
  memberCatalog: CourseMemberUser[];
  memberSearch: string;
  onSearchChange: (value: string) => void;
  onToggleMember: (userId: string) => void;
}) {
  const filteredMembers = memberCatalog.filter((user) => {
    const query = memberSearch.trim().toLowerCase();
    if (!query) return true;
    return (
      (user.name || "").toLowerCase().includes(query) ||
      (user.email || "").toLowerCase().includes(query)
    );
  });

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Course Members</h2>
          </div>
          <div className="w-full md:max-w-sm">
            <Label className="mb-2 block">Search users</Label>
            <Input
              value={memberSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by name or email"
            />
          </div>
        </div>

        {(course.memberUsers || []).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {(course.memberUsers || []).map((member) => (
              <Badge
                key={member.id}
                variant="outline"
                className="border-cyan-200 bg-cyan-50 text-cyan-700"
              >
                {member.name?.trim() || member.email || member.id}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-slate-500">No members assigned yet.</p>
        )}

        <div className="max-h-[320px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
          {filteredMembers.length === 0 ? (
            <p className="text-sm text-slate-500">No users found.</p>
          ) : (
            filteredMembers.map((user) => {
              const checked = (course.memberUserIds || []).includes(user.id);

              return (
                <label
                  key={user.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                    checked
                      ? "border-cyan-600 bg-cyan-50"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggleMember(user.id)}
                    className="mt-1 h-4 w-4"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">
                      {user.name?.trim() || "No Name"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">{user.email || "No email"}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {user.tier} user
                      {user.activeCourseIds.length > 0
                        ? ` • ${user.activeCourseIds.length} course access`
                        : ""}
                    </p>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </CardContent>
    </Card>
  );
}
