"use client";

import { useEffect, useMemo, useState } from "react";
import { Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  contentTypeLabels,
  type Course,
  type CourseMemberAccessGrant,
  type CourseMemberUser,
  type CourseSection,
  type SectionCatalog,
} from "./types";

function getSectionItems(section: CourseSection, catalog: SectionCatalog) {
  const items = catalog[section.contentType] || [];
  const itemLookup = new Map(items.map((item) => [item.id, item]));

  return section.linkedContentIds
    .map((contentId) => itemLookup.get(contentId))
    .filter(Boolean) as Array<{ id: string; title: string; subtitle?: string }>;
}

function getGrantForSection(
  grant: CourseMemberAccessGrant,
  sectionId: string
) {
  return grant.sectionGrants.find((sectionGrant) => sectionGrant.sectionId === sectionId) ?? null;
}

export function CourseMemberAccessGrantManager({
  course,
  memberCatalog,
  catalog,
  search,
  onSearchChange,
  onAddGrantUser,
  onRemoveGrantUser,
  onSetSectionMode,
  onToggleSectionContent,
  onSetVivaMinutes,
}: {
  course: Course;
  memberCatalog: CourseMemberUser[];
  catalog: SectionCatalog;
  search: string;
  onSearchChange: (value: string) => void;
  onAddGrantUser: (userId: string) => void;
  onRemoveGrantUser: (userId: string) => void;
  onSetSectionMode: (
    userId: string,
    sectionId: string,
    mode: "none" | "full" | "partial"
  ) => void;
  onToggleSectionContent: (userId: string, sectionId: string, contentId: string) => void;
  onSetVivaMinutes: (userId: string, sectionId: string, minutes: number) => void;
}) {
  const [vivaMinuteDrafts, setVivaMinuteDrafts] = useState<Record<string, string>>({});
  const filteredMembers = memberCatalog.filter((user) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      (user.name || "").toLowerCase().includes(query) ||
      (user.email || "").toLowerCase().includes(query)
    );
  });

  const courseMemberIds = new Set(course.memberUserIds || []);
  const grantUserIds = new Set((course.memberAccessGrants || []).map((grant) => grant.userId));
  const availableMembers = filteredMembers.filter(
    (user) => courseMemberIds.has(user.id) && !grantUserIds.has(user.id)
  );
  const visibleGrants = (course.memberAccessGrants || []).filter((grant) =>
    courseMemberIds.has(grant.userId)
  );

  const draftSeed = useMemo(() => {
    const next: Record<string, string> = {};
    return next;
  }, [course.memberAccessGrants]);

  useEffect(() => {
    setVivaMinuteDrafts(draftSeed);
  }, [draftSeed]);

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="space-y-6 p-6">
        <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-slate-900">Section Access Grants</h2>
            <p className="mt-1 text-sm text-slate-500">
              Grant full or partial access to individual sections, and assign AI viva minute credit
              when a section contains viva cases.
            </p>
          </div>
          <div className="w-full md:max-w-sm">
            <Label className="mb-2 block">Search users</Label>
            <Input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by name or email"
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            Add learner to section grants
          </p>
          {availableMembers.length === 0 ? (
            <p className="mt-3 text-sm text-slate-500">
              No checked course members are waiting to be added to section grants.
            </p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {availableMembers.map((user) => (
                <Button
                  key={user.id}
                  type="button"
                  variant="outline"
                  className="border-slate-200 bg-white"
                  onClick={() => onAddGrantUser(user.id)}
                >
                  {user.name?.trim() || user.email || user.id}
                </Button>
              ))}
            </div>
          )}
        </div>

        {visibleGrants.length === 0 ? (
          <p className="text-sm text-slate-500">
            No checked course members have section-level grants configured yet.
          </p>
        ) : (
          <div className="space-y-4">
            {visibleGrants.map((grant) => (
              <div
                key={grant.userId}
                className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
              >
                <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-base font-semibold text-slate-900">
                        {grant.name?.trim() || grant.email || grant.userId}
                      </p>
                      <Badge
                        variant="outline"
                        className="border-cyan-200 bg-cyan-50 text-cyan-700"
                      >
                        {(grant.sectionGrants || []).length} section grant(s)
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-slate-500">
                      {grant.email || "No email found for this learner yet."}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    className="border-rose-200 text-rose-600 hover:bg-rose-50"
                    onClick={() => onRemoveGrantUser(grant.userId)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remove
                  </Button>
                </div>

                <div className="mt-4 space-y-4">
                  {(course.sections || []).length === 0 ? (
                    <p className="text-sm text-slate-500">
                      Add course sections first, then assign this learner inside the relevant
                      sections.
                    </p>
                  ) : (
                    (course.sections || []).map((section) => {
                      const sectionGrant = getGrantForSection(grant, section.id);
                      const mode = sectionGrant?.accessMode ?? "none";
                      const sectionItems = getSectionItems(section, catalog);

                      return (
                        <div
                          key={`${grant.userId}-${section.id}`}
                          className="rounded-2xl border border-slate-200 bg-white p-4"
                        >
                          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {section.title}
                              </p>
                              <p className="mt-1 text-xs text-slate-500">
                                {contentTypeLabels[section.contentType]} •{" "}
                                {section.linkedContentIds.length} linked item(s)
                              </p>
                            </div>
                            <div className="w-full lg:max-w-[220px]">
                              <Label className="mb-2 block text-xs text-slate-500">
                                Section access
                              </Label>
                              <Select
                                value={mode}
                                onValueChange={(value) =>
                                  onSetSectionMode(
                                    grant.userId,
                                    section.id,
                                    value as "none" | "full" | "partial"
                                  )
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="none">No access</SelectItem>
                                  <SelectItem value="full">Full section access</SelectItem>
                                  <SelectItem value="partial">Partial item access</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          {mode === "partial" ? (
                            <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                                Allowed content inside this section
                              </p>

                              {sectionItems.length === 0 ? (
                                <p className="text-sm text-slate-500">
                                  No linked content available in this section.
                                </p>
                              ) : (
                                sectionItems.map((item) => {
                                  const checked = sectionGrant?.contentIds.includes(item.id) ?? false;

                                  return (
                                    <label
                                      key={`${grant.userId}-${section.id}-${item.id}`}
                                      className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                                        checked
                                          ? "border-cyan-600 bg-cyan-50"
                                          : "border-slate-200 bg-white hover:border-slate-300"
                                      }`}
                                    >
                                      <input
                                        type="checkbox"
                                        checked={checked}
                                        onChange={() =>
                                          onToggleSectionContent(grant.userId, section.id, item.id)
                                        }
                                        className="mt-1 h-4 w-4"
                                      />
                                      <div>
                                        <p className="text-sm font-medium text-slate-900">
                                          {item.title}
                                        </p>
                                        {item.subtitle ? (
                                          <p className="mt-1 text-xs text-slate-500">
                                            {item.subtitle}
                                          </p>
                                        ) : null}
                                      </div>
                                    </label>
                                  );
                                })
                              )}
                            </div>
                          ) : null}

                          {section.contentType === "ai-vivas" && mode !== "none" ? (
                            <div className="mt-4 max-w-[420px] space-y-2">
                              <Label>AI viva minutes for this learner</Label>
                              <p className="text-xs text-slate-500">
                                Currently allotted:{" "}
                                <span className="font-semibold text-slate-700">
                                  {Math.max(0, Number(sectionGrant?.vivaMinutes || 0))} minute(s)
                                </span>
                              </p>
                              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                                <Input
                                  type="number"
                                  min={0}
                                  value={
                                    vivaMinuteDrafts[`${grant.userId}:${section.id}`] ??
                                    ""
                                  }
                                  onChange={(event) =>
                                    setVivaMinuteDrafts((prev) => ({
                                      ...prev,
                                      [`${grant.userId}:${section.id}`]: event.target.value,
                                    }))
                                  }
                                />
                                <Button
                                  type="button"
                                  className="bg-cyan-600 text-white hover:bg-cyan-700"
                                  disabled={
                                    Math.max(
                                      0,
                                      Number(
                                        vivaMinuteDrafts[`${grant.userId}:${section.id}`] ?? 0
                                      )
                                    ) <= 0
                                  }
                                  onClick={() => {
                                    const draftMinutes = Math.max(
                                      0,
                                      Number(
                                        vivaMinuteDrafts[`${grant.userId}:${section.id}`] ?? 0
                                      )
                                    );

                                    if (draftMinutes <= 0) return;

                                    onSetVivaMinutes(grant.userId, section.id, draftMinutes);
                                    setVivaMinuteDrafts((prev) => ({
                                      ...prev,
                                      [`${grant.userId}:${section.id}`]: "",
                                    }));
                                  }}
                                >
                                  Allot{" "}
                                  {Math.max(
                                    0,
                                    Number(
                                      vivaMinuteDrafts[`${grant.userId}:${section.id}`] ??
                                        0
                                    )
                                  )}{" "}
                                  viva minutes
                                </Button>
                              </div>
                              <p className="text-xs text-slate-500">
                                Each new allotment adds on top of the learner&apos;s existing viva
                                credit for this section.
                              </p>
                            </div>
                          ) : null}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
