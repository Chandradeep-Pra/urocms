"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  BookOpen,
  Brain,
  ChevronDown,
  ClipboardList,
  FileQuestion,
  Layers,
  Sparkles,
  Trash2,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

type ContentType = "videos" | "chapter-quizzes" | "mocks" | "grand-mocks" | "ai-vivas";
type IconKey = "book-open" | "video" | "brain" | "clipboard-list" | "sparkles" | "file-question";
type AccessTier = "free" | "paid";

type CourseSection = {
  id: string;
  iconKey: IconKey;
  title: string;
  contentType: ContentType;
  linkedContentIds: string[];
};

type Course = {
  id: string;
  title: string;
  description?: string;
  slug?: string;
  accessTier?: AccessTier;
  showOnApp?: boolean;
  sections?: CourseSection[];
};

type CatalogItem = {
  id: string;
  title: string;
  subtitle?: string;
};

type SectionCatalog = Record<ContentType, CatalogItem[]>;

const iconOptions: Array<{ key: IconKey; label: string; icon: typeof BookOpen }> = [
  { key: "book-open", label: "Book Open", icon: BookOpen },
  { key: "video", label: "Video", icon: Video },
  { key: "brain", label: "Brain", icon: Brain },
  { key: "clipboard-list", label: "Clipboard List", icon: ClipboardList },
  { key: "sparkles", label: "Sparkles", icon: Sparkles },
  { key: "file-question", label: "File Question", icon: FileQuestion },
];

const contentTypeLabels: Record<ContentType, string> = {
  videos: "Videos",
  "chapter-quizzes": "Chapter Quizzes",
  mocks: "Mocks",
  "grand-mocks": "Grand Mocks",
  "ai-vivas": "AI Vivas",
};

const emptySection: CourseSection = {
  id: "",
  iconKey: "book-open",
  title: "",
  contentType: "videos",
  linkedContentIds: [],
};

function getIcon(iconKey: IconKey) {
  return iconOptions.find((item) => item.key === iconKey)?.icon || BookOpen;
}

function AccessTierSwitch({
  value,
  onChange,
}: {
  value: AccessTier;
  onChange: (value: AccessTier) => void;
}) {
  const isPaid = value === "paid";

  return (
    <div className="flex items-center justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
          Course Access
        </p>
        <p className="mt-2 text-sm text-slate-600">
          Switch this course between free and paid access.
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
  const [expandedSections, setExpandedSections] = useState<string[]>([]);

  const sectionCount = useMemo(() => course?.sections?.length ?? 0, [course]);

  const fetchCourse = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/courses/${courseId}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch course");
      const nextCourse = data.course
        ? {
            ...data.course,
            accessTier: data.course.accessTier === "paid" ? "paid" : "free",
            showOnApp: Boolean(data.course.showOnApp),
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
      const res = await fetch("/api/courses/content-catalog", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch content catalog");
      setCatalog(data.catalog);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to fetch content catalog");
    }
  };

  useEffect(() => {
    if (courseId) {
      fetchCourse();
      fetchCatalog();
    }
  }, [courseId]);

  const persistCourse = async (nextCourse: Course) => {
    try {
      setSaving(true);
      const res = await fetch(`/api/courses/${courseId}`, {
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
    const confirmed = window.confirm("Delete this section from the course?");
    if (!confirmed) return;

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

  const getCatalogForType = (contentType: ContentType) => catalog[contentType] || [];

  const updateCourseVisibility = async (checked: boolean) => {
    if (!course) return;
    await persistCourse({
      ...course,
      showOnApp: checked,
    });
  };

  const updateCourseAccessTier = async (nextTier: AccessTier) => {
    if (!course) return;
    await persistCourse({
      ...course,
      accessTier: nextTier,
    });
  };

  const toggleSectionExpanded = (sectionId: string) => {
    setExpandedSections((prev) =>
      prev.includes(sectionId)
        ? prev.filter((id) => id !== sectionId)
        : [...prev, sectionId]
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
              <h1 className="text-lg font-semibold text-slate-900">Course not found</h1>
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
                <div className="mt-3">
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
              <div className="rounded-2xl bg-slate-50 px-4 py-4 min-w-[240px]">
                <AccessTierSwitch
                  value={course.accessTier === "paid" ? "paid" : "free"}
                  onChange={updateCourseAccessTier}
                />
              </div>
              <div className="rounded-2xl bg-slate-50 px-4 py-4 min-w-[220px]">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Show On App
                    </p>
                    {/* <p className="mt-2 text-sm text-slate-600">
                      Control whether learners can see this course.
                    </p> */}
                  </div>
                  <Switch checked={Boolean(course.showOnApp)} onCheckedChange={updateCourseVisibility} />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-5 p-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Add Section</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Pick the section type, then attach the live content buckets already created in the CMS.
                </p>
              </div>

              <div className="space-y-2">
                <Label>Section Icon</Label>
                <Select
                  value={newSection.iconKey}
                  onValueChange={(value: IconKey) =>
                    setNewSection((prev) => ({ ...prev, iconKey: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {iconOptions.map((item) => (
                      <SelectItem key={item.key} value={item.key}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Section Title</Label>
                <Input
                  value={newSection.title}
                  onChange={(event) =>
                    setNewSection((prev) => ({ ...prev, title: event.target.value }))
                  }
                  placeholder="Core Videos"
                />
              </div>

              <div className="space-y-2">
                <Label>Content Type</Label>
                <Select
                  value={newSection.contentType}
                  onValueChange={(value: ContentType) =>
                    setNewSection((prev) => ({ ...prev, contentType: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(contentTypeLabels).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Attach Content</Label>
                <div className="max-h-[220px] space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  {getCatalogForType(newSection.contentType).length === 0 ? (
                    <p className="text-sm text-slate-500">No content found for this type yet.</p>
                  ) : (
                    getCatalogForType(newSection.contentType).map((item) => {
                      const checked = newSection.linkedContentIds.includes(item.id);

                      return (
                        <label
                          key={item.id}
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
                              setNewSection((prev) => ({
                                ...prev,
                                linkedContentIds: checked
                                  ? prev.linkedContentIds.filter((id) => id !== item.id)
                                  : [...prev.linkedContentIds, item.id],
                              }))
                            }
                            className="mt-1 h-4 w-4"
                          />
                          <div>
                            <p className="text-sm font-medium text-slate-900">{item.title}</p>
                            {item.subtitle ? (
                              <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
                            ) : null}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                  Preview
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm">
                    {(() => {
                      const Icon = getIcon(newSection.iconKey);
                      return <Icon className="h-5 w-5" />;
                    })()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {newSection.title || "Section title"}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {contentTypeLabels[newSection.contentType]}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {newSection.linkedContentIds.length} content item(s) attached
                    </p>
                  </div>
                </div>
              </div>

              <Button onClick={addSection} disabled={saving} className="w-full bg-cyan-600 text-white hover:bg-cyan-700">
                {saving ? "Saving..." : "Add Section"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-4 p-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Course Sections</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Each section is a top-level block inside this course.
                </p>
              </div>

              {(course.sections || []).length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
                  <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-500 shadow-sm">
                    <Layers className="h-6 w-6" />
                  </div>
                  <p className="mt-4 text-sm font-medium text-slate-900">No sections added yet</p>
                  <p className="mt-2 text-sm text-slate-500">
                    Add the first section from the left panel.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {(course.sections || []).map((section) => {
                    const Icon = getIcon(section.iconKey);
                    const isExpanded = expandedSections.includes(section.id);

                    return (
                      <div
                        key={section.id}
                        className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <button
                            type="button"
                            onClick={() => toggleSectionExpanded(section.id)}
                            className="flex flex-1 items-center gap-3 text-left"
                          >
                            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{section.title}</p>
                              <p className="mt-1 text-xs text-slate-500">
                                {contentTypeLabels[section.contentType]}
                              </p>
                              <p className="mt-1 text-xs text-slate-400">
                                {section.linkedContentIds.length} content item(s) attached
                              </p>
                            </div>
                            <ChevronDown
                              className={`ml-auto h-4 w-4 text-slate-400 transition-transform ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                            />
                          </button>

                          <button
                            type="button"
                            onClick={() => deleteSection(section.id)}
                            className="rounded-xl border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {isExpanded ? (
                          <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                              Attached Content
                            </p>

                            {getCatalogForType(section.contentType).length === 0 ? (
                              <p className="text-sm text-slate-500">No content available for this type yet.</p>
                            ) : (
                              getCatalogForType(section.contentType).map((item) => {
                                const checked = section.linkedContentIds.includes(item.id);

                                return (
                                  <label
                                    key={`${section.id}-${item.id}`}
                                    className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-3 py-3 transition ${
                                      checked
                                        ? "border-cyan-600 bg-cyan-50"
                                        : "border-slate-200 bg-slate-50 hover:border-slate-300"
                                    }`}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={checked}
                                      onChange={() => updateSectionContent(section.id, item.id)}
                                      className="mt-1 h-4 w-4"
                                    />
                                    <div>
                                      <p className="text-sm font-medium text-slate-900">{item.title}</p>
                                      {item.subtitle ? (
                                        <p className="mt-1 text-xs text-slate-500">{item.subtitle}</p>
                                      ) : null}
                                    </div>
                                  </label>
                                );
                              })
                            )}
                          </div>
                        ) : null}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
