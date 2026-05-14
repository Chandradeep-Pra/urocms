"use client";

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
import { getCourseIcon, iconOptions } from "./courseConfig";
import {
  contentTypeLabels,
  type ContentType,
  type CourseSection,
  type SectionCatalog,
} from "./types";

export function CourseSectionBuilder({
  section,
  catalog,
  saving,
  onChange,
  onToggleContent,
  onAdd,
}: {
  section: CourseSection;
  catalog: SectionCatalog;
  saving: boolean;
  onChange: (section: CourseSection) => void;
  onToggleContent: (contentId: string) => void;
  onAdd: () => void;
}) {
  const items = catalog[section.contentType] || [];

  return (
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
            value={section.iconKey}
            onValueChange={(value) =>
              onChange({ ...section, iconKey: value as CourseSection["iconKey"] })
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
            value={section.title}
            onChange={(event) => onChange({ ...section, title: event.target.value })}
            placeholder="Core Videos"
          />
        </div>

        <div className="space-y-2">
          <Label>Content Type</Label>
          <Select
            value={section.contentType}
            onValueChange={(value) =>
              onChange({
                ...section,
                contentType: value as ContentType,
                linkedContentIds: [],
              })
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
            {items.length === 0 ? (
              <p className="text-sm text-slate-500">No content found for this type yet.</p>
            ) : (
              items.map((item) => {
                const checked = section.linkedContentIds.includes(item.id);
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
                      onChange={() => onToggleContent(item.id)}
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
                const Icon = getCourseIcon(section.iconKey);
                return <Icon className="h-5 w-5" />;
              })()}
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">
                {section.title || "Section title"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{contentTypeLabels[section.contentType]}</p>
              <p className="mt-1 text-xs text-slate-400">
                {section.linkedContentIds.length} content item(s) attached
              </p>
            </div>
          </div>
        </div>

        <Button onClick={onAdd} disabled={saving} className="w-full bg-cyan-600 text-white hover:bg-cyan-700">
          {saving ? "Saving..." : "Add Section"}
        </Button>
      </CardContent>
    </Card>
  );
}
