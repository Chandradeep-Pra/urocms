"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { CourseAccessTierSwitch } from "@/components/dashboard/courses/CourseAccessTierSwitch";
import { CourseMemberAccessGrantManager } from "@/components/dashboard/courses/CourseMemberAccessGrantManager";
import { CourseMemberPicker } from "@/components/dashboard/courses/CourseMemberPicker";
import { CourseSectionBuilder } from "@/components/dashboard/courses/CourseSectionBuilder";
import { CourseSectionList } from "@/components/dashboard/courses/CourseSectionList";
import {
  CourseAccessBadge,
  CourseVisibilityBadge,
} from "@/components/dashboard/courses/CourseStatusBadges";
import {
  emptySection,
  type Course,
  type CourseAccessTier,
  type CourseMemberAccessGrant,
  type CourseMemberUser,
  type CourseSection,
  type SectionCatalog,
} from "@/components/dashboard/courses/types";
import { EmptyState } from "@/components/dashboard/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { adminFetch } from "@/lib/client/adminApi";

export default function CourseDetailPage() {
  const params = useParams<{ id: string }>();
  const courseId = String(params?.id || "");

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [newSection, setNewSection] = useState<CourseSection>(emptySection);
  const [catalog, setCatalog] = useState<SectionCatalog>({
    videos: [],
    "chapter-quizzes": [],
    mocks: [],
    "grand-mocks": [],
    "ai-vivas": [],
  });
  const [memberCatalog, setMemberCatalog] = useState<CourseMemberUser[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [grantSearch, setGrantSearch] = useState("");
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const sectionCount = useMemo(() => course?.sections?.length ?? 0, [course]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const res = await adminFetch(`/api/courses/${courseId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch course");
      const nextCourse = data.course
        ? {
            ...data.course,
            accessTier: data.course.accessTier === "members" ? "members" : "free",
            showOnApp: Boolean(data.course.showOnApp),
            memberUserIds: Array.isArray(data.course.memberUserIds) ? data.course.memberUserIds : [],
            memberUsers: Array.isArray(data.course.memberUsers) ? data.course.memberUsers : [],
            memberAccessGrants: Array.isArray(data.course.memberAccessGrants)
              ? data.course.memberAccessGrants.map((grant: CourseMemberAccessGrant) => ({
                  ...grant,
                  sectionGrants: Array.isArray(grant.sectionGrants)
                    ? grant.sectionGrants.map((sectionGrant) => ({
                        ...sectionGrant,
                        contentIds: Array.isArray(sectionGrant.contentIds)
                          ? sectionGrant.contentIds
                          : [],
                        vivaMinutes: Number.isFinite(Number(sectionGrant.vivaMinutes))
                          ? Math.max(0, Number(sectionGrant.vivaMinutes))
                          : 0,
                      }))
                    : [],
                }))
              : [],
            sections: Array.isArray(data.course.sections)
              ? data.course.sections.map((section: CourseSection) => ({
                  ...section,
                  linkedContentIds: Array.isArray(section.linkedContentIds)
                    ? section.linkedContentIds
                    : [],
                }))
              : [],
          }
        : null;
      setCourse(nextCourse);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch course");
    } finally {
      setLoading(false);
    }
  };

  const fetchCatalog = async () => {
    try {
      const res = await adminFetch("/api/courses/content-catalog");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch content catalog");
      setCatalog(data.catalog);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch content catalog");
    }
  };

  const fetchMemberCatalog = async () => {
    try {
      const res = await adminFetch("/api/courses/members-catalog");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch members");
      setMemberCatalog(data.users || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch members");
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchCatalog();
      fetchMemberCatalog();
    }
  }, [courseId]);

  const persistCourse = async (nextCourse: Course) => {
    try {
      setSaving(true);
      const res = await adminFetch(`/api/courses/${courseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nextCourse),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update course");
      setCourse(nextCourse);
      toast.success("Course updated");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update course");
    } finally {
      setSaving(false);
    }
  };

  const addSection = async () => {
    if (!course) return;
    if (!newSection.title.trim()) {
      toast.error("Section title is required");
      return;
    }

    const section: CourseSection = {
      ...newSection,
      id: crypto.randomUUID(),
      title: newSection.title.trim(),
      linkedContentIds: [...newSection.linkedContentIds],
    };

    await persistCourse({
      ...course,
      sections: [...(course.sections || []), section],
    });

    setExpandedSections((prev) => [...new Set([...prev, section.id])]);
    setNewSection(emptySection);
  };

  const deleteSection = async (sectionId: string) => {
    if (!course) return;
    await persistCourse({
      ...course,
      sections: (course.sections || []).filter((section) => section.id !== sectionId),
    });
  };

  const updateSectionContent = async (sectionId: string, contentId: string) => {
    if (!course) return;

    const nextSections = (course.sections || []).map((section) => {
      if (section.id !== sectionId) return section;

      const nextIds = section.linkedContentIds.includes(contentId)
        ? section.linkedContentIds.filter((id) => id !== contentId)
        : [...section.linkedContentIds, contentId];

      return {
        ...section,
        linkedContentIds: nextIds,
      };
    });

    await persistCourse({
      ...course,
      sections: nextSections,
    });
  };

  const updateCourseVisibility = async (checked: boolean) => {
    if (!course) return;
    await persistCourse({
      ...course,
      showOnApp: checked,
    });
  };

  const updateCourseAccessTier = async (nextTier: CourseAccessTier) => {
    if (!course) return;
    await persistCourse({
      ...course,
      accessTier: nextTier,
    });
  };

  const toggleCourseMember = async (userId: string) => {
    if (!course) return;

    const nextMemberUserIds = (course.memberUserIds || []).includes(userId)
      ? (course.memberUserIds || []).filter((id) => id !== userId)
      : [...(course.memberUserIds || []), userId];

    const nextMemberUsers = memberCatalog
      .filter((user) => nextMemberUserIds.includes(user.id))
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
      }));

    await persistCourse({
      ...course,
      memberUserIds: nextMemberUserIds,
      memberUsers: nextMemberUsers,
    });
  };

  const addGrantUser = async (userId: string) => {
    if (!course) return;

    const user = memberCatalog.find((item) => item.id === userId);
    if (!user) {
      toast.error("User not found");
      return;
    }

    if ((course.memberAccessGrants || []).some((grant) => grant.userId === userId)) {
      return;
    }

    await persistCourse({
      ...course,
      memberAccessGrants: [
        ...(course.memberAccessGrants || []),
        {
          userId: user.id,
          name: user.name,
          email: user.email,
          sectionGrants: [],
        },
      ],
    });
  };

  const removeGrantUser = async (userId: string) => {
    if (!course) return;

    await persistCourse({
      ...course,
      memberAccessGrants: (course.memberAccessGrants || []).filter(
        (grant) => grant.userId !== userId
      ),
    });
  };

  const setGrantSectionMode = async (
    userId: string,
    sectionId: string,
    mode: "none" | "full" | "partial"
  ) => {
    if (!course) return;

    const nextGrants = (course.memberAccessGrants || []).map((grant) => {
      if (grant.userId !== userId) return grant;

      const existingGrant =
        grant.sectionGrants.find((sectionGrant) => sectionGrant.sectionId === sectionId) ?? null;

      if (mode === "none") {
        return {
          ...grant,
          sectionGrants: grant.sectionGrants.filter(
            (sectionGrant) => sectionGrant.sectionId !== sectionId
          ),
        };
      }

      const nextSectionGrant = {
        sectionId,
        accessMode: mode === "partial" ? "partial" : "full",
        contentIds:
          mode === "partial"
            ? existingGrant?.contentIds || []
            : [],
        vivaMinutes: existingGrant?.vivaMinutes || 0,
      };

      const withoutCurrent = grant.sectionGrants.filter(
        (sectionGrant) => sectionGrant.sectionId !== sectionId
      );

      return {
        ...grant,
        sectionGrants: [...withoutCurrent, nextSectionGrant],
      };
    });

    await persistCourse({
      ...course,
      memberAccessGrants: nextGrants,
    });
  };

  const toggleGrantSectionContent = async (
    userId: string,
    sectionId: string,
    contentId: string
  ) => {
    if (!course) return;

    const nextGrants = (course.memberAccessGrants || []).map((grant) => {
      if (grant.userId !== userId) return grant;

      const existingGrant =
        grant.sectionGrants.find((sectionGrant) => sectionGrant.sectionId === sectionId) ?? {
          sectionId,
          accessMode: "partial" as const,
          contentIds: [],
          vivaMinutes: 0,
        };

      const nextContentIds = existingGrant.contentIds.includes(contentId)
        ? existingGrant.contentIds.filter((id) => id !== contentId)
        : [...existingGrant.contentIds, contentId];

      const withoutCurrent = grant.sectionGrants.filter(
        (sectionGrant) => sectionGrant.sectionId !== sectionId
      );

      return {
        ...grant,
        sectionGrants: [
          ...withoutCurrent,
          {
            ...existingGrant,
            accessMode: "partial",
            contentIds: nextContentIds,
          },
        ],
      };
    });

    await persistCourse({
      ...course,
      memberAccessGrants: nextGrants,
    });
  };

  const setGrantVivaMinutes = async (
    userId: string,
    sectionId: string,
    minutes: number
  ) => {
    if (!course) return;

    const nextGrants = (course.memberAccessGrants || []).map((grant) => {
      if (grant.userId !== userId) return grant;

      const existingGrant =
        grant.sectionGrants.find((sectionGrant) => sectionGrant.sectionId === sectionId) ?? {
          sectionId,
          accessMode: "full" as const,
          contentIds: [],
          vivaMinutes: 0,
        };

      const withoutCurrent = grant.sectionGrants.filter(
        (sectionGrant) => sectionGrant.sectionId !== sectionId
      );

      return {
        ...grant,
        sectionGrants: [
          ...withoutCurrent,
          {
            ...existingGrant,
            vivaMinutes: Math.max(0, Number(minutes || 0)),
          },
        ],
      };
    });

    await persistCourse({
      ...course,
      memberAccessGrants: nextGrants,
    });
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId) ? prev.filter((id) => id !== sectionId) : [...prev, sectionId]
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
        <div className="mx-auto max-w-6xl">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-6 text-sm text-slate-500">Loading course...</CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
        <div className="mx-auto max-w-6xl">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="p-10 text-center">
              <EmptyState
                icon={ArrowLeft}
                title="Course not found"
                description="The course could not be loaded. Head back to the course list."
              />
              <Button asChild variant="outline" className="mt-4 border-slate-200">
                <Link href="/dashboard/curriculum/courses">Back to courses</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100 p-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <div className="flex flex-col gap-4">
          <Button asChild variant="outline" className="w-fit border-slate-200">
            <Link href="/dashboard/curriculum/courses">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Courses
            </Link>
          </Button>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-600">
                  Course Builder
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                  {course.title}
                </h1>
                <div className="mt-3 flex flex-wrap gap-2">
                  <CourseAccessBadge accessTier={course.accessTier} />
                  <CourseVisibilityBadge showOnApp={course.showOnApp} />
                </div>
                <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-500">
                  {course.description || "No description added for this course yet."}
                </p>
              </div>

              <div className="rounded-2xl bg-slate-50 px-4 py-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Sections
                </p>
                <p className="mt-2 text-2xl font-semibold text-slate-900">{sectionCount}</p>
              </div>
              <div className="min-w-[240px] rounded-2xl bg-slate-50 px-4 py-4">
                <CourseAccessTierSwitch
                  value={course.accessTier === "members" ? "members" : "free"}
                  onChange={updateCourseAccessTier}
                  compact
                />
              </div>
              <div className="min-w-[220px] rounded-2xl bg-slate-50 px-4 py-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Show On App
                    </p>
                  </div>
                  <Switch
                    checked={Boolean(course.showOnApp)}
                    onCheckedChange={updateCourseVisibility}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <CourseMemberPicker
          course={course}
          memberCatalog={memberCatalog}
          memberSearch={memberSearch}
          onSearchChange={setMemberSearch}
          onToggleMember={toggleCourseMember}
        />

        <CourseMemberAccessGrantManager
          course={course}
          memberCatalog={memberCatalog}
          catalog={catalog}
          search={grantSearch}
          onSearchChange={setGrantSearch}
          onAddGrantUser={addGrantUser}
          onRemoveGrantUser={removeGrantUser}
          onSetSectionMode={setGrantSectionMode}
          onToggleSectionContent={toggleGrantSectionContent}
          onSetVivaMinutes={setGrantVivaMinutes}
        />

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <CourseSectionBuilder
            section={newSection}
            catalog={catalog}
            saving={saving}
            onChange={setNewSection}
            onToggleContent={(contentId) =>
              setNewSection((prev) => ({
                ...prev,
                linkedContentIds: prev.linkedContentIds.includes(contentId)
                  ? prev.linkedContentIds.filter((id) => id !== contentId)
                  : [...prev.linkedContentIds, contentId],
              }))
            }
            onAdd={addSection}
          />

          <CourseSectionList
            sections={course.sections || []}
            catalog={catalog}
            expandedSections={expandedSections}
            onToggleExpanded={toggleSectionExpanded}
            onToggleContent={updateSectionContent}
            onDelete={deleteSection}
          />
        </div>
      </div>
    </div>
  );
}
