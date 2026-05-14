"use client";

import { ChevronDown, Layers, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/dashboard/shared/ConfirmDialog";
import { EmptyState } from "@/components/dashboard/shared/EmptyState";
import { getCourseIcon } from "./courseConfig";
import { contentTypeLabels, type CourseSection, type SectionCatalog } from "./types";

export function CourseSectionList({
  sections,
  catalog,
  expandedSections,
  onToggleExpanded,
  onToggleContent,
  onDelete,
}: {
  sections: CourseSection[];
  catalog: SectionCatalog;
  expandedSections: string[];
  onToggleExpanded: (sectionId: string) => void;
  onToggleContent: (sectionId: string, contentId: string) => void;
  onDelete: (sectionId: string) => void;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="space-y-4 p-6">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Course Sections</h2>
          <p className="mt-1 text-sm text-slate-500">
            Each section is a top-level block inside this course.
          </p>
        </div>

        {sections.length === 0 ? (
          <EmptyState
            icon={Layers}
            title="No sections added yet"
            description="Add the first section from the left panel."
          />
        ) : (
          <div className="space-y-3">
            {sections.map((section) => {
              const Icon = getCourseIcon(section.iconKey);
              const isExpanded = expandedSections.includes(section.id);
              const items = catalog[section.contentType] || [];

              return (
                <div
                  key={section.id}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => onToggleExpanded(section.id)}
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

                    <ConfirmDialog
                      title="Delete this section?"
                      description="This removes the section from the course."
                      confirmLabel="Delete Section"
                      destructive
                      onConfirm={() => onDelete(section.id)}
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

                  {isExpanded ? (
                    <div className="mt-4 space-y-2 rounded-2xl border border-slate-200 bg-white p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                        Attached Content
                      </p>

                      {items.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No content available for this type yet.
                        </p>
                      ) : (
                        items.map((item) => {
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
                                onChange={() => onToggleContent(section.id, item.id)}
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
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
