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
  CopyPlus,
  Crown,
  GraduationCap,
  FolderKanban,
  Gift,
  Layers3,
  ShieldCheck,
  RefreshCcw,
  Trash2,
  UsersRound,
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
  parentId?: string | null;
};

type PlanSelection = {
  chapterIds: string[];
  videoIds: string[];
  quizIds: string[];
  mockIds: string[];
  vivaCaseIds: string[];
};

type PlanAccessScopes = {
  courseIds: string[];
  chapterGroupIds: string[];
  videoSectionIds: string[];
  vivaFolderIds: string[];
};

type PricingPlan = {
  id: string;
  name: string;
  description: string;
  tag?: string;
  category?: string;
  price: number;
  expiryMonths: number;
  durationLabel?: string;
  billingLabel?: string;
  availabilityNote?: string;
  featureBullets?: string[];
  sortOrder?: number;
  vivaMinutes?: number;
  currency: "GBP";
  isActive: boolean;
  selectedContent: PlanSelection;
  accessScopes?: PlanAccessScopes;
  contentCounts?: {
    chapters: number;
    videos: number;
    quizzes: number;
    mocks: number;
    vivaCases: number;
    total: number;
  };
};

type PricingCoupon = {
  id: string;
  code: string;
  description?: string;
  discountType: "percent" | "amount";
  discountValue: number;
  startsAt?: string | null;
  endsAt?: string | null;
  isActive: boolean;
};

type CatalogResponse = {
  courses: CatalogItem[];
  chapters: CatalogItem[];
  chapterGroups: CatalogItem[];
  videoSections: CatalogItem[];
  videos: CatalogItem[];
  quizzes: CatalogItem[];
  mocks: CatalogItem[];
  vivaCases: CatalogItem[];
  vivaFolders: CatalogItem[];
};

const emptySelection: PlanSelection = {
  chapterIds: [],
  videoIds: [],
  quizIds: [],
  mockIds: [],
  vivaCaseIds: [],
};

const emptyScopes: PlanAccessScopes = {
  courseIds: [],
  chapterGroupIds: [],
  videoSectionIds: [],
  vivaFolderIds: [],
};

const emptyForm = {
  name: "",
  description: "",
  tag: "",
  category: "",
  price: "49",
  expiryMonths: 1,
  durationLabel: "",
  billingLabel: "",
  availabilityNote: "",
  sortOrder: 0,
  vivaMinutes: 0,
  featureBulletsText: "",
  isActive: true,
  accessScopes: emptyScopes,
  selectedContent: emptySelection,
};

const emptyCouponForm = {
  code: "",
  description: "",
  discountType: "percent" as "percent" | "amount",
  discountValue: "10",
  startsAt: "",
  endsAt: "",
  isActive: true,
};

const expiryPresets = [1, 2, 3, 6, 12];

const planPatterns = [
  {
    key: "course-viva",
    title: "Course + Viva",
    icon: GraduationCap,
    description: "For CORE and ELITE style lecture-led plans.",
    values: {
      category: "FRCS Urology Section 2",
      durationLabel: "6 Months",
      availabilityNote: "",
      featureBulletsText: "Live Lectures + Viva Practice\nFull Recordings Access",
      vivaMinutes: 0,
    },
  },
  {
    key: "ai-viva",
    title: "AI Viva Pack",
    icon: Brain,
    description: "For stand-alone AI viva subscriptions.",
    values: {
      category: "FRCS Urology Section 2",
      durationLabel: "3 Months",
      availabilityNote: "",
      featureBulletsText: "AI-Based Viva Practice (500 minutes)",
      vivaMinutes: 500,
    },
  },
  {
    key: "mock-package",
    title: "Mock Package",
    icon: ShieldCheck,
    description: "For one or multiple mock exam offers.",
    values: {
      category: "FRCS Urology Section 2",
      durationLabel: "1 Mock",
      availabilityNote: "Limited slots only",
      featureBulletsText: "Face-to-Face Online Mock Exam",
      vivaMinutes: 0,
    },
  },
  {
    key: "mentorship",
    title: "Mentorship",
    icon: UsersRound,
    description: "For one-to-one executive mentoring plans.",
    values: {
      category: "FRCS Urology Section 2",
      durationLabel: "8 Sessions",
      availabilityNote: "Limited slots only",
      featureBulletsText: "One to one live online sessions",
      vivaMinutes: 0,
    },
  },
  {
    key: "combined-program",
    title: "Combined Program",
    icon: Layers3,
    description: "For Section 1 + Section 2 bundled pathways.",
    values: {
      category: "Combined Section 1 + Section 2",
      durationLabel: "6 Months",
      availabilityNote: "",
      featureBulletsText: "Urologics ELITE SBA\nUrologics ELITE Viva",
      vivaMinutes: 0,
    },
  },
] as const;

export default function PlanCreatorPage() {
  const [catalog, setCatalog] = useState<CatalogResponse>({
    chapters: [],
    chapterGroups: [],
    courses: [],
    videoSections: [],
    videos: [],
    quizzes: [],
    mocks: [],
    vivaCases: [],
    vivaFolders: [],
  });
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [coupons, setCoupons] = useState<PricingCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingCoupon, setSavingCoupon] = useState(false);
  const [importingPresets, setImportingPresets] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [couponForm, setCouponForm] = useState(emptyCouponForm);

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
      setCoupons(data.coupons || []);
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

  const totalScopedGroups = useMemo(() => {
    const scopes = form.accessScopes;
    return scopes.chapterGroupIds.length + scopes.videoSectionIds.length + scopes.vivaFolderIds.length;
  }, [form.accessScopes]);
  const totalScopedGroupsWithCourses = useMemo(() => {
    const scopes = form.accessScopes;
    return (
      scopes.courseIds.length +
      scopes.chapterGroupIds.length +
      scopes.videoSectionIds.length +
      scopes.vivaFolderIds.length
    );
  }, [form.accessScopes]);

  const monthlyLabelSuggestion = useMemo(() => {
    const price = Number(form.price);
    const months = Number(form.expiryMonths);

    if (!Number.isFinite(price) || price <= 0 || !Number.isFinite(months) || months <= 0) {
      return "";
    }

    const perMonth = Math.round(price / months);
    return `£${perMonth}/month`;
  }, [form.price, form.expiryMonths]);

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
      accessScopes: {
        courseIds: [],
        chapterGroupIds: [],
        videoSectionIds: [],
        vivaFolderIds: [],
      },
      selectedContent: {
        chapterIds: [],
        videoIds: [],
        quizIds: [],
        mockIds: [],
        vivaCaseIds: [],
      },
    });
  };

  const applyPattern = (patternKey: (typeof planPatterns)[number]["key"]) => {
    const pattern = planPatterns.find((item) => item.key === patternKey);
    if (!pattern) return;

    setForm((prev) => ({
      ...prev,
      category: pattern.values.category,
      durationLabel: pattern.values.durationLabel,
      availabilityNote: pattern.values.availabilityNote,
      featureBulletsText: pattern.values.featureBulletsText,
      vivaMinutes: pattern.values.vivaMinutes,
    }));
  };

  const updateScopeSelection = (key: keyof PlanAccessScopes, id: string) => {
    setForm((prev) => {
      const selected = prev.accessScopes[key];
      const nextValues = selected.includes(id)
        ? selected.filter((value) => value !== id)
        : [...selected, id];

      return {
        ...prev,
        accessScopes: {
          ...prev.accessScopes,
          [key]: nextValues,
        },
      };
    });
  };

  const hydrateForm = (plan: PricingPlan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description || "",
      tag: plan.tag || "",
      category: plan.category || "",
      price: String(plan.price ?? ""),
      expiryMonths: Number(plan.expiryMonths || 1),
      durationLabel: plan.durationLabel || "",
      billingLabel: plan.billingLabel || "",
      availabilityNote: plan.availabilityNote || "",
      sortOrder: Number(plan.sortOrder || 0),
      vivaMinutes: Number(plan.vivaMinutes || 0),
      featureBulletsText: Array.isArray(plan.featureBullets)
        ? plan.featureBullets.join("\n")
        : "",
      isActive: plan.isActive !== false,
      accessScopes: {
        courseIds: [...(plan.accessScopes?.courseIds || [])],
        chapterGroupIds: [...(plan.accessScopes?.chapterGroupIds || [])],
        videoSectionIds: [...(plan.accessScopes?.videoSectionIds || [])],
        vivaFolderIds: [...(plan.accessScopes?.vivaFolderIds || [])],
      },
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
      category: form.category.trim(),
      price: Number(form.price),
      expiryMonths: Number(form.expiryMonths),
      durationLabel: form.durationLabel.trim(),
      billingLabel: form.billingLabel.trim(),
      availabilityNote: form.availabilityNote.trim(),
      sortOrder: Number(form.sortOrder),
      vivaMinutes: Number(form.vivaMinutes),
      featureBullets: form.featureBulletsText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      isActive: form.isActive,
      accessScopes: form.accessScopes,
      selectedContent: form.selectedContent,
    };

    if (!payload.name) {
      toast.error("Plan name is required");
      return;
    }

    if (!payload.category) {
      toast.error("Category is required");
      return;
    }

    if (!Number.isFinite(payload.price) || payload.price < 0) {
      toast.error("Enter a valid price");
      return;
    }

    if ((!Number.isFinite(payload.expiryMonths) || payload.expiryMonths <= 0) && !payload.durationLabel) {
      toast.error("Add a valid expiry month count or a custom duration label");
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

  const importPresets = async () => {
    try {
      setImportingPresets(true);
      const res = await fetch("/api/pricing-plans/presets", { method: "POST" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to import presets");
      }
      toast.success(`Imported ${data.imported || 0} FRCS pricing presets`);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to import presets");
    } finally {
      setImportingPresets(false);
    }
  };

  const handleCreateCoupon = async () => {
    try {
      setSavingCoupon(true);
      const res = await fetch("/api/pricing-coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: couponForm.code,
          description: couponForm.description,
          discountType: couponForm.discountType,
          discountValue: Number(couponForm.discountValue),
          startsAt: couponForm.startsAt || null,
          endsAt: couponForm.endsAt || null,
          isActive: couponForm.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create coupon");
      }

      toast.success("Coupon launched");
      setCouponForm(emptyCouponForm);
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create coupon");
    } finally {
      setSavingCoupon(false);
    }
  };

  const toggleCoupon = async (coupon: PricingCoupon, nextValue: boolean) => {
    try {
      const res = await fetch(`/api/pricing-coupons/${coupon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextValue }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update coupon");
      }
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update coupon");
    }
  };

  const deleteCoupon = async (id: string) => {
    try {
      const res = await fetch(`/api/pricing-coupons/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete coupon");
      }
      toast.success("Coupon deleted");
      fetchData();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete coupon");
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
                Use your exact FRCS pricing structure, add display-friendly duration labels, and
                launch temporary coupons whenever you want a campaign push.
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
            <Button onClick={importPresets} disabled={importingPresets} className="bg-slate-900 text-white">
              <CopyPlus className="mr-2 h-4 w-4" />
              {importingPresets ? "Importing..." : "Load FRCS Presets"}
            </Button>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-slate-200 shadow-sm">
            <CardContent className="space-y-6 p-6">
              <div>
                <h2 className="text-xl font-semibold text-slate-900">Scope-based access</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Build plans around courses first, then add chapter groups, video sections, and viva folders when you need deeper scope control.
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <SelectionGroup
                  title="Courses"
                  icon={FolderKanban}
                  items={catalog.courses}
                  selectedIds={form.accessScopes.courseIds}
                  onToggle={(id) => updateScopeSelection("courseIds", id)}
                  renderMeta={(item) => (
                    <>
                      <span>{item.accessTier === "paid" ? "Paid" : "Free"}</span>
                      <span>{item.showOnApp ? "Visible on app" : "Hidden on app"}</span>
                      <span>{item.sectionsCount ?? 0} sections</span>
                    </>
                  )}
                  fullWidth
                />

                <SelectionGroup
                  title="Chapter Groups"
                  icon={Layers3}
                  items={catalog.chapterGroups}
                  selectedIds={form.accessScopes.chapterGroupIds}
                  onToggle={(id) => updateScopeSelection("chapterGroupIds", id)}
                  renderMeta={(item) => (
                    <>
                      <span>Group scope</span>
                      {item.parentId ? <span>Nested</span> : <span>Top level</span>}
                    </>
                  )}
                />

                <SelectionGroup
                  title="Video Sections"
                  icon={Video}
                  items={catalog.videoSections}
                  selectedIds={form.accessScopes.videoSectionIds}
                  onToggle={(id) => updateScopeSelection("videoSectionIds", id)}
                  renderMeta={(item) => (
                    <>
                      <span>Section scope</span>
                      {item.accessTier ? <span>{item.accessTier}</span> : null}
                    </>
                  )}
                />

                <SelectionGroup
                  title="Viva Folders"
                  icon={Brain}
                  items={catalog.vivaFolders}
                  selectedIds={form.accessScopes.vivaFolderIds}
                  onToggle={(id) => updateScopeSelection("vivaFolderIds", id)}
                  renderMeta={() => (
                    <>
                      <span>Folder scope</span>
                    </>
                  )}
                  fullWidth
                />
              </div>

              <div className="border-t border-slate-200 pt-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <h2 className="text-xl font-semibold text-slate-900">Manual overrides</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Use exact items only when a plan needs something more custom than scope-based access.
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
                      Configure price, duration, display labels, and the exact unlock package.
                    </p>
                  </div>
                  {editingId ? (
                    <Badge variant="outline" className="border-slate-200 text-slate-600">
                      Editing
                    </Badge>
                  ) : null}
                </div>

                <div className="space-y-4">
                  <div className="space-y-3">
                    <Label>Plan pattern</Label>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {planPatterns.map((pattern) => {
                        const Icon = pattern.icon;
                        return (
                          <button
                            key={pattern.key}
                            type="button"
                            onClick={() => applyPattern(pattern.key)}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-left transition hover:border-slate-300 hover:bg-white"
                          >
                            <div className="flex items-start gap-3">
                              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white text-slate-700 shadow-sm">
                                <Icon className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="text-sm font-semibold text-slate-900">{pattern.title}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-500">
                                  {pattern.description}
                                </p>
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan-name">Plan name</Label>
                    <Input
                      id="plan-name"
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      placeholder="Urologics ELITE Viva"
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
                      placeholder="Designed for candidates who need the full live course plus AI viva time."
                      className="min-h-[110px]"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plan-tag">Tag (optional)</Label>
                      <Input
                        id="plan-tag"
                        value={form.tag}
                        onChange={(event) => setForm((prev) => ({ ...prev, tag: event.target.value }))}
                        placeholder="Best Value"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plan-category">Category</Label>
                      <Input
                        id="plan-category"
                        value={form.category}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, category: event.target.value }))
                        }
                        placeholder="FRCS Urology Section 2"
                      />
                    </div>
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
                        placeholder="799"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plan-expiry">Expiry (months)</Label>
                      <Input
                        id="plan-expiry"
                        type="number"
                        min="0"
                        value={form.expiryMonths}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            expiryMonths: Number(event.target.value || 0),
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

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plan-duration-label">Display duration label</Label>
                      <Input
                        id="plan-duration-label"
                        value={form.durationLabel}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, durationLabel: event.target.value }))
                        }
                        placeholder="6 Months / 2 Mocks / 16 Sessions"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plan-billing-label">Billing label</Label>
                      <Input
                        id="plan-billing-label"
                        value={form.billingLabel}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, billingLabel: event.target.value }))
                        }
                        placeholder="£130/month"
                      />
                      {monthlyLabelSuggestion ? (
                        <button
                          type="button"
                          onClick={() =>
                            setForm((prev) => ({ ...prev, billingLabel: monthlyLabelSuggestion }))
                          }
                          className="text-xs font-medium text-emerald-600 transition hover:text-emerald-700"
                        >
                          Use suggested label: {monthlyLabelSuggestion}
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plan-availability">Availability note</Label>
                      <Input
                        id="plan-availability"
                        value={form.availabilityNote}
                        onChange={(event) =>
                          setForm((prev) => ({ ...prev, availabilityNote: event.target.value }))
                        }
                        placeholder="Limited slots only"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="plan-sort-order">Sort order</Label>
                      <Input
                        id="plan-sort-order"
                        type="number"
                        value={form.sortOrder}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            sortOrder: Number(event.target.value || 0),
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="plan-viva-minutes">AI viva minutes</Label>
                      <Input
                        id="plan-viva-minutes"
                        type="number"
                        min="0"
                        step="10"
                        value={form.vivaMinutes}
                        onChange={(event) =>
                          setForm((prev) => ({
                            ...prev,
                            vivaMinutes: Number(event.target.value || 0),
                          }))
                        }
                        placeholder="500"
                      />
                      <p className="text-xs text-slate-500">
                        One viva is typically around 10 minutes. 500 minutes is roughly 50 viva sessions.
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label>Quick viva presets</Label>
                      <div className="flex flex-wrap gap-2">
                        {[0, 100, 250, 500].map((value) => (
                          <button
                            key={value}
                            type="button"
                            onClick={() => setForm((prev) => ({ ...prev, vivaMinutes: value }))}
                            className={`rounded-full border px-3 py-1.5 text-sm transition ${
                              Number(form.vivaMinutes) === value
                                ? "border-slate-900 bg-slate-900 text-white"
                                : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                            }`}
                          >
                            {value} min
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="plan-features">Feature bullets</Label>
                    <Textarea
                      id="plan-features"
                      value={form.featureBulletsText}
                      onChange={(event) =>
                        setForm((prev) => ({ ...prev, featureBulletsText: event.target.value }))
                      }
                      placeholder={"Live Lectures + Viva Practice\nFull Recordings Access\nAI Viva Mock (500 minutes)"}
                      className="min-h-[120px]"
                    />
                    <div className="flex flex-wrap gap-2">
                      {[
                        "Live Lectures + Viva Practice",
                        "Full Recordings Access",
                        "AI Viva Mock (500 minutes)",
                        "AI-Based Viva Practice (500 minutes)",
                        "Face-to-Face Online Mock Exam",
                        "One to one live online sessions",
                        "Urologics ELITE SBA",
                        "Urologics ELITE Viva",
                      ].map((feature) => (
                        <button
                          key={feature}
                          type="button"
                          onClick={() =>
                            setForm((prev) => {
                              const existing = prev.featureBulletsText
                                .split("\n")
                                .map((item) => item.trim())
                                .filter(Boolean);

                              if (existing.includes(feature)) {
                                return prev;
                              }

                              return {
                                ...prev,
                                featureBulletsText: [...existing, feature].join("\n"),
                              };
                            })
                          }
                          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs text-slate-600 transition hover:border-slate-300 hover:bg-white"
                        >
                          + {feature}
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
                    <p>{totalScopedGroupsWithCourses} access scopes selected</p>
                    <p>{totalSelected} content items selected</p>
                    <p>Price: £{form.price || "0"}</p>
                    <p>
                      Duration:{" "}
                      {form.durationLabel ||
                        `${form.expiryMonths} month${form.expiryMonths > 1 ? "s" : ""}`}
                    </p>
                    <p>AI Viva Minutes: {Number(form.vivaMinutes || 0)}</p>
                    {form.billingLabel ? <p>Billing: {form.billingLabel}</p> : null}
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
                      Existing pricing plans created from your catalog and presets.
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
                            {plan.category ? (
                              <p className="mt-2 text-xs font-medium uppercase tracking-[0.14em] text-slate-400">
                                {plan.category}
                              </p>
                            ) : null}
                          </div>

                          <div className="text-right">
                            <p className="text-xl font-semibold text-slate-900">£{plan.price}</p>
                            <p className="text-xs text-slate-500">
                              {plan.durationLabel ||
                                `${plan.expiryMonths} month${plan.expiryMonths > 1 ? "s" : ""}`}
                            </p>
                            {plan.billingLabel ? (
                              <p className="mt-1 text-xs text-emerald-600">{plan.billingLabel}</p>
                            ) : null}
                          </div>
                        </div>

                        {plan.featureBullets?.length ? (
                          <div className="mt-4 flex flex-wrap gap-2 text-xs">
                            {plan.featureBullets.map((feature) => (
                              <span
                                key={`${plan.id}-${feature}`}
                                className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-600"
                              >
                                {feature}
                              </span>
                            ))}
                          </div>
                        ) : null}

                        <div className="mt-4 flex flex-wrap gap-2 text-xs">
                          {plan.accessScopes?.courseIds?.length ? (
                            <PlanCountBadge
                              label="Courses"
                              value={plan.accessScopes.courseIds.length}
                            />
                          ) : null}
                          {plan.accessScopes?.chapterGroupIds?.length ? (
                            <PlanCountBadge
                              label="Chapter Groups"
                              value={plan.accessScopes.chapterGroupIds.length}
                            />
                          ) : null}
                          {plan.accessScopes?.videoSectionIds?.length ? (
                            <PlanCountBadge
                              label="Video Sections"
                              value={plan.accessScopes.videoSectionIds.length}
                            />
                          ) : null}
                          {plan.accessScopes?.vivaFolderIds?.length ? (
                            <PlanCountBadge
                              label="Viva Folders"
                              value={plan.accessScopes.vivaFolderIds.length}
                            />
                          ) : null}
                          {plan.vivaMinutes ? (
                            <PlanCountBadge label="Viva Minutes" value={plan.vivaMinutes} />
                          ) : null}
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

            <Card className="border-slate-200 shadow-sm">
              <CardContent className="space-y-5 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-slate-900">Coupon launcher</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Launch short-term discounts without changing the main plan pricing.
                    </p>
                  </div>
                  <Gift className="h-5 w-5 text-amber-500" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Coupon code</Label>
                    <Input
                      value={couponForm.code}
                      onChange={(event) =>
                        setCouponForm((prev) => ({
                          ...prev,
                          code: event.target.value.toUpperCase(),
                        }))
                      }
                      placeholder="MAYVIVA20"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Discount type</Label>
                    <div className="flex gap-2">
                      {[
                        { key: "percent", label: "Percent" },
                        { key: "amount", label: "Amount" },
                      ].map((option) => (
                        <button
                          key={option.key}
                          type="button"
                          onClick={() =>
                            setCouponForm((prev) => ({
                              ...prev,
                              discountType: option.key as "percent" | "amount",
                            }))
                          }
                          className={`rounded-full border px-3 py-2 text-sm ${
                            couponForm.discountType === option.key
                              ? "border-slate-900 bg-slate-900 text-white"
                              : "border-slate-200 bg-white text-slate-600"
                          }`}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Discount value</Label>
                    <Input
                      type="number"
                      min="1"
                      value={couponForm.discountValue}
                      onChange={(event) =>
                        setCouponForm((prev) => ({ ...prev, discountValue: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Input
                      value={couponForm.description}
                      onChange={(event) =>
                        setCouponForm((prev) => ({ ...prev, description: event.target.value }))
                      }
                      placeholder="Launch offer for viva candidates"
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Starts at</Label>
                    <Input
                      type="date"
                      value={couponForm.startsAt}
                      onChange={(event) =>
                        setCouponForm((prev) => ({ ...prev, startsAt: event.target.value }))
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Ends at</Label>
                    <Input
                      type="date"
                      value={couponForm.endsAt}
                      onChange={(event) =>
                        setCouponForm((prev) => ({ ...prev, endsAt: event.target.value }))
                      }
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-slate-900">Coupon active</p>
                    <p className="text-xs text-slate-500">Show this coupon on the public pricing page.</p>
                  </div>
                  <Switch
                    checked={couponForm.isActive}
                    onCheckedChange={(checked) =>
                      setCouponForm((prev) => ({ ...prev, isActive: checked }))
                    }
                  />
                </div>

                <Button onClick={handleCreateCoupon} disabled={savingCoupon} className="w-full">
                  {savingCoupon ? "Launching..." : "Launch Coupon"}
                </Button>

                <div className="space-y-3">
                  {coupons.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No coupons launched yet.
                    </div>
                  ) : (
                    coupons.map((coupon) => (
                      <div
                        key={coupon.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-base font-semibold text-slate-900">{coupon.code}</p>
                              <Badge
                                className={
                                  coupon.isActive
                                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100"
                                    : "bg-slate-100 text-slate-600 hover:bg-slate-100"
                                }
                              >
                                {coupon.isActive ? "Active" : "Inactive"}
                              </Badge>
                            </div>
                            <p className="mt-1 text-sm text-slate-500">
                              {coupon.description || "No description added."}
                            </p>
                            <p className="mt-2 text-xs text-slate-500">
                              {coupon.discountType === "percent"
                                ? `${coupon.discountValue}% off`
                                : `£${coupon.discountValue} off`}
                            </p>
                          </div>
                          <Switch
                            checked={coupon.isActive}
                            onCheckedChange={(checked) => toggleCoupon(coupon, checked)}
                          />
                        </div>

                        <div className="mt-4 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-rose-200 text-rose-600 hover:bg-rose-50 hover:text-rose-700"
                            onClick={() => deleteCoupon(coupon.id)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
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
