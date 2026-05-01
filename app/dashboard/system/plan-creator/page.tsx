"use client";

import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import {
  Brain,
  Clock3,
  Crown,
  FolderKanban,
  Layers3,
  RefreshCcw,
  Trash2,
  Video,
} from "lucide-react";

type CatalogItem = {
  id: string;
  title: string;
  type?: string;
  nodeType?: string;
  isPremium?: boolean;
  attemptsCount?: number;
  durationMinutes?: number;
  accessTier?: "free" | "paid";
};

type PlanSelection = {
  chapterIds: string[];
  videoIds: string[];
  quizIds: string[];
  mockIds: string[];
  vivaCaseIds: string[];
};

type PricingPlan = {
  id: string;
  name: string;
  description: string;
  tag?: string;
  price: number;
  expiryMonths: number;
  currency: "GBP";
  isActive: boolean;
  selectedContent: PlanSelection;
  contentCounts?: {
    chapters: number;
    videos: number;
    quizzes: number;
    mocks: number;
    vivaCases: number;
    total: number;
  };
};

type CatalogResponse = {
  chapters: CatalogItem[];
  videos: CatalogItem[];
  quizzes: CatalogItem[];
  mocks: CatalogItem[];
  vivaCases: CatalogItem[];
};

const emptySelection: PlanSelection = {
  chapterIds: [],
  videoIds: [],
  quizIds: [],
  mockIds: [],
  vivaCaseIds: [],
};

const emptyForm = {
  name: "",
  description: "",
  tag: "",
  price: "49",
  expiryMonths: 1,
  isActive: true,
  selectedContent: emptySelection,
};

const expiryPresets = [1, 2, 3, 6, 12];

export default function PlanCreatorPage() {
  const [catalog, setCatalog] = useState<CatalogResponse>({
    chapters: [],
    videos: [],
    quizzes: [],
    mocks: [],
    vivaCases: [],
  });
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);

  const fetchData = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/pricing-plans", { cache: "no-store" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to load pricing plans");
      }

      setCatalog(data.catalog);
      setPlans(data.plans || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load pricing plans");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const totalSelected = useMemo(() => {
    const selection = form.selectedContent;
    return (
      selection.chapterIds.length +
      selection.videoIds.length +
      selection.quizIds.length +
      selection.mockIds.length +
      selection.vivaCaseIds.length
    );
  }, [form.selectedContent]);

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return catalog;

    const filterItems = (items: CatalogItem[]) =>
      items.filter((item) => item.title.toLowerCase().includes(term));

    return {
      chapters: filterItems(catalog.chapters),
      videos: filterItems(catalog.videos),
      quizzes: filterItems(catalog.quizzes),
      mocks: filterItems(catalog.mocks),
      vivaCases: filterItems(catalog.vivaCases),
    };
  }, [catalog, search]);

  const updateSelection = (key: keyof PlanSelection, id: string) => {
    setForm((prev) => {
      const selected = prev.selectedContent[key];
      const nextValues = selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id];

      return {
        ...prev,
        selectedContent: {
          ...prev.selectedContent,
          [key]: nextValues,
        },
      };
    });
  };

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      selectedContent: {
        chapterIds: [],
        videoIds: [],
        quizIds: [],
        mockIds: [],
        vivaCaseIds: [],
      },
    });
  };

  const hydrateForm = (plan: PricingPlan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description || "",
      tag: plan.tag || "",
      price: String(plan.price ?? ""),
      expiryMonths: Number(plan.expiryMonths || 1),
      isActive: plan.isActive !== false,
      selectedContent: {
        chapterIds: [...(plan.selectedContent?.chapterIds || [])],
        videoIds: [...(plan.selectedContent?.videoIds || [])],
        quizIds: [...(plan.selectedContent?.quizIds || [])],
        mockIds: [...(plan.selectedContent?.mockIds || [])],
        vivaCaseIds: [...(plan.selectedContent?.vivaCaseIds || [])],
      },
    });
  };

  const handleSave = async () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      tag: form.tag.trim(),
      price: Number(form.price),
      expiryMonths: Number(form.expiryMonths),
      isActive: form.isActive,
      selectedContent: form.selectedContent,
    };

    if (!payload.name) {
      toast.error("Plan name is required");
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      toast.error("Enter a valid price");
      return;
    }

    if (!Number.isFinite(payload.expiryMonths) || payload.expiryMonths <= 0) {
      toast.error("Expiry months should be greater than 0");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch(
        editingId ? `/api/pricing-plans/${editingId}` : "/api/pricing-plans",
        {
          method: editingId ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save plan");
      }

      toast.success(editingId ? "Plan updated" : "Plan created");
      resetForm();
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save plan");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const res = await fetch(`/api/pricing-plans/${id}`, { method: "DELETE" });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to delete plan");
      }

      if (editingId === id) {
        resetForm();
      }

      toast.success("Plan deleted");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete plan");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">Plan Creator</Badge>
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
                Build highly customizable pricing plans
              </h1>
              <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-600">
                Combine chapters, videos, quizzes, mocks, and AI viva sets into custom packs.
                Set the price, set the expiry in months, and control exactly what a user unlocks.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={fetchData} className="border-slate-200 bg-white">
              <RefreshCcw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
            <Button variant="outline" onClick={resetForm} className="border-slate-200 bg-white">
              Reset Form
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-6 p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Available content</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Select exactly what goes into this pricing plan.
                  </p>
                </div>

                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search content..."
                  className="w-full max-w-sm bg-white"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SelectionGroup
                  title="Chapters"
                  icon={Layers3}
                  items={filteredCatalog.chapters}
                  selectedIds={form.selectedContent.chapterIds}
                  onToggle={(id) => updateSelection("chapterIds", id)}
                  renderMeta={(item) => (
                    <>
                      <span>{item.nodeType || "TEST"}</span>
                      {item.isPremium ? <span>Premium source</span> : null}
                    </>
                  )}
                />

                <SelectionGroup
                  title="Videos"
                  icon={Video}
                  items={filteredCatalog.videos}
                  selectedIds={form.selectedContent.videoIds}
                  onToggle={(id) => updateSelection("videoIds", id)}
                  renderMeta={(item) => (
                    <>
                      <span>{item.accessTier === "paid" ? "Paid video" : "Free video"}</span>
                      <span>{item.type || item.accessTier || "Video"}</span>
                    </>
                  )}
                />

                <SelectionGroup
                  title="Quizzes"
                  icon={FolderKanban}
                  items={filteredCatalog.quizzes}
                  selectedIds={form.selectedContent.quizIds}
                  onToggle={(id) => updateSelection("quizIds", id)}
                  renderMeta={(item) => (
                    <>
                      <span>{item.type || "chapter"}</span>
                      {item.durationMinutes ? <span>{item.durationMinutes} min</span> : null}
                    </>
                  )}
                />

                <SelectionGroup
                  title="Scheduled Mocks"
                  icon={Clock3}
                  items={filteredCatalog.mocks}
                  selectedIds={form.selectedContent.mockIds}
                  onToggle={(id) => updateSelection("mockIds", id)}
                  renderMeta={(item) => (
                    <>
                      <span>{item.type || "mock"}</span>
                      <span>{item.attemptsCount ?? 0} attempts</span>
                    </>
                  )}
                />

                <SelectionGroup
                  title="AI Viva Sets"
                  icon={Brain}
                  items={filteredCatalog.vivaCases}
                  selectedIds={form.selectedContent.vivaCaseIds}
                  onToggle={(id) => updateSelection("vivaCaseIds", id)}
                  renderMeta={(item) => (
                    <>
                      <span>AI Viva</span>
                      <span>{item.attemptsCount ?? 0} attempts</span>
                    </>
                  )}
                  fullWidth
                />
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-6 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">
                      {editingId ? "Edit plan" : "Create plan"}
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Configure price, duration, and the exact unlock package.
                    </p>
                  </div>
                  {editingId ? (
                    <Badge variant="outline" className="border-slate-200 text-slate-600">
                      Editing
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="plan-name">Plan name</Label>
                    <Input
                      id="plan-name"
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="FRCS Core Prep Pack"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan-description">Description</Label>
                    <Textarea
                      id="plan-description"
                      value={form.description}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Designed for candidates who need chapter quizzes, core videos, and one viva track."
                      className="min-h-[110px]"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan-tag">Tag (optional)</Label>
                    <Input
                      id="plan-tag"
                      value={form.tag}
                      onChange={(event) => setForm((prev) => ({ ...prev, tag: event.target.value }))}
                      placeholder="Best Value"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plan-price">Price (GBP)</Label>
                      <Input
                        id="plan-price"
                        type="number"
                        min="0"
                        value={form.price}
                        onChange={(event) => setForm((prev) => ({ ...prev, price: event.target.value }))}
                        placeholder="49"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plan-expiry">Expiry (months)</Label>
                      <Input
                        id="plan-expiry"
                        type="number"
                        min="1"
                        value={form.expiryMonths}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            expiryMonths: Number(event.target.value || 1),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Quick expiry presets</Label>
                    <div className="flex flex-wrap gap-2">
                      {expiryPresets.map((months) => (
                        <button
                          key={months}
                          type="button"
                          onClick={() => setForm((prev) => ({ ...prev, expiryMonths: months }))}
                          className={`rounded-full border px-3 py-1.5 text-sm transition ${
                            form.expiryMonths === months
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          }`}
                        >
                          {months} month{months > 1 ? "s" : ""}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-900">Plan active</p>
                      <p className="text-xs text-slate-500">
                        Keep this on if the plan should be visible for assignment or sale.
                      </p>
                    </div>
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
                    />
                  </div>
                </div>

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-center gap-2 text-amber-900">
                    <Crown className="h-4 w-4" />
                    <p className="text-sm font-semibold">Plan summary</p>
                  </div>
                  <div className="mt-3 grid gap-2 text-sm text-amber-900/80">
                    <p>{totalSelected} content items selected</p>
                    <p>Price: £{form.price || "0"}</p>
                    <p>Expiry: {form.expiryMonths} month{form.expiryMonths > 1 ? "s" : ""}</p>
                  </div>
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? "Saving..." : editingId ? "Update Plan" : "Create Plan"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-4 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Saved plans</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Existing custom pricing plans created from your content catalog.
                    </p>
                  </div>
                  <Badge variant="outline" className="border-slate-200 text-slate-600">
                    {plans.length} total
                  </Badge>
                </div>

                {loading ? (
                  <p className="text-sm text-slate-500">Loading plans...</p>
                ) : plans.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
                    No pricing plans created yet.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {plans.map((plan) => (
                      <div
                        key={plan.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <p className="text-base font-semibold text-slate-900">{plan.name}</p>
                              {plan.tag ? (
                                <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100">
                                  {plan.tag}
                                </Badge>
                              ) : null}
                              <Badge
                                className={
                                  plan.isActive
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                                }
                              >
                                {plan.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="mt-2 text-sm leading-6 text-slate-500">
                              {plan.description || "No description added yet."}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="text-xl font-semibold text-slate-900">£{plan.price}</p>
                            <p className="text-xs text-slate-500">
                              {plan.expiryMonths} month{plan.expiryMonths > 1 ? "s" : ""}
                            </p>
                          </div>
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          <PlanCountBadge label="Chapters" value={plan.contentCounts?.chapters ?? 0} />
                          <PlanCountBadge label="Videos" value={plan.contentCounts?.videos ?? 0} />
                          <PlanCountBadge label="Quizzes" value={plan.contentCounts?.quizzes ?? 0} />
                          <PlanCountBadge label="Mocks" value={plan.contentCounts?.mocks ?? 0} />
                          <PlanCountBadge label="Viva" value={plan.contentCounts?.vivaCases ?? 0} />
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => hydrateForm(plan)}>
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => handleDelete(plan.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function SelectionGroup({
  title,
  icon: Icon,
  items,
  selectedIds,
  onToggle,
  renderMeta,
  fullWidth = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: CatalogItem[];
  selectedIds: string[];
  onToggle: (id: string) => void;
  renderMeta: (item: CatalogItem) => React.ReactNode;
  fullWidth?: boolean;
}) {
  return (
    <div className={fullWidth ? "md:col-span-2" : ""}>
      <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm">
              <Icon className="h-4 w-4" />
            </div>
            <div>
              <p className="font-medium text-slate-900">{title}</p>
              <p className="text-xs text-slate-500">{selectedIds.length} selected</p>
            </div>
          </div>
          <Badge variant="outline" className="border-slate-200 text-slate-600">
            {items.length}
          </Badge>
        </div>

        <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 text-sm text-slate-500">
              No items found.
            </div>
          ) : (
            items.map((item) => {
              const checked = selectedIds.includes(item.id);

              return (
                <label
                  key={item.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-3 transition ${
                    checked
                      ? "border-slate-900 bg-slate-900 text-white"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => onToggle(item.id)}
                    className="mt-1 h-4 w-4 rounded border-slate-300"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm font-medium ${checked ? "text-white" : "text-slate-900"}`}>
                      {item.title}
                    </p>
                    <div className={`mt-1 flex flex-wrap gap-2 text-xs ${checked ? "text-white/70" : "text-slate-500"}`}>
                      {renderMeta(item)}
                    </div>
                  </div>
                </label>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}

function PlanCountBadge({ label, value }: { label: string; value: number }) {
  return (
    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600">
      {label}: {value}
    </span>
  );
}
