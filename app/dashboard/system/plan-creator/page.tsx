"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { BadgePercent, ClipboardList, FolderOpen, Layers3, RefreshCw, RotateCcw, Users } from "lucide-react";
import { adminFetch } from "@/lib/client/adminApi";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PlanAccessScopePanel } from "@/components/dashboard/plan-creator/PlanAccessScopePanel";
import { CouponLauncherCard } from "@/components/dashboard/plan-creator/CouponLauncherCard";
import {
  createEmptyPlanVersion,
  emptyCatalog,
  emptyCouponForm,
  emptyForm,
  emptyScopes,
  emptySelection,
} from "@/components/dashboard/plan-creator/constants";
import { PlanFormCard } from "@/components/dashboard/plan-creator/PlanFormCard";
import { PlanManualOverridePanel } from "@/components/dashboard/plan-creator/PlanManualOverridePanel";
import { SavedPlansPanel } from "@/components/dashboard/plan-creator/SavedPlansPanel";
import { WaitlistResponsesPanel } from "@/components/dashboard/plan-creator/WaitlistResponsesPanel";
import type {
  CatalogResponse,
  PlanAccessScopes,
  PlanSelection,
  PricingCoupon,
  PricingPlan,
  PricingPlanWaitlistResponse,
} from "@/components/dashboard/plan-creator/types";

export default function PlanCreatorPage() {
  const [activeTab, setActiveTab] = useState("builder");
  const [catalog, setCatalog] = useState<CatalogResponse>(emptyCatalog);
  const [plans, setPlans] = useState<PricingPlan[]>([]);
  const [coupons, setCoupons] = useState<PricingCoupon[]>([]);
  const [waitlistResponses, setWaitlistResponses] = useState<PricingPlanWaitlistResponse[]>([]);
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
      setWaitlistResponses(data.waitlistResponses || []);
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
    return (
      scopes.courseIds.length +
      scopes.chapterGroupIds.length +
      scopes.videoSectionIds.length +
      scopes.vivaFolderIds.length
    );
  }, [form.accessScopes]);

  const filteredCatalog = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) {
      return {
        chapters: catalog.chapters,
        videos: catalog.videos,
        quizzes: catalog.quizzes,
        mocks: catalog.mocks,
        vivaCases: catalog.vivaCases,
      };
    }

    const filterItems = (items: typeof catalog.chapters) =>
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

  const resetForm = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      accessScopes: { ...emptyScopes },
      selectedContent: { ...emptySelection },
      versions: [createEmptyPlanVersion(3, { price: "49" })],
    });
    setActiveTab("builder");
  };

  const hydrateForm = (plan: PricingPlan) => {
    setEditingId(plan.id);
    const fallbackVersions =
      Array.isArray(plan.versions) && plan.versions.length > 0
        ? plan.versions
        : [
            {
              id: "legacy-default",
              months: Number(plan.expiryMonths || 3),
              price: Number(plan.originalPrice ?? plan.price ?? 0),
              couponId: plan.couponId || "",
              embeddedLink: plan.embeddedLink || "",
              durationLabel: plan.durationLabel || "",
              billingLabel: plan.billingLabel || "",
            },
          ];
      setForm({
        name: plan.name,
        description: plan.description || "",
        tag: plan.tag || "",
        category: plan.category || "",
        categorySortOrder: Number(plan.categorySortOrder || 0),
      versions: fallbackVersions.map((version, index) =>
        createEmptyPlanVersion(Number(version.months || 3), {
          id: String(version.id || `version-${index + 1}`),
          price: String(version.price ?? version.originalPrice ?? ""),
          couponId: "",
          embeddedLink: version.embeddedLink || "",
          durationLabel: version.durationLabel || "",
          billingLabel: version.billingLabel || "",
        })
      ),
      eligibleCouponIds: Array.isArray(plan.eligibleCouponIds)
        ? [...plan.eligibleCouponIds]
        : Array.from(new Set(fallbackVersions.map((version) => version.couponId || "").filter(Boolean))),
      marketingCouponId:
        plan.marketingCouponId || plan.couponId || fallbackVersions[0]?.couponId || "",
      availabilityNote: plan.availabilityNote || "",
      sortOrder: Number(plan.sortOrder || 0),
      vivaMinutes: Number(plan.vivaMinutes || 0),
      featureBulletsText: Array.isArray(plan.featureBullets) ? plan.featureBullets.join("\n") : "",
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
    setActiveTab("builder");
  };

  const handleSave = async () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      tag: form.tag.trim(),
      category: form.category.trim(),
      categorySortOrder: Number(form.categorySortOrder),
      versions: form.versions.map((version) => ({
        id: version.id,
        months: Number(version.months),
        price: Number(version.price),
        couponId: version.couponId,
        embeddedLink: version.embeddedLink.trim(),
        durationLabel: version.durationLabel.trim(),
        billingLabel: version.billingLabel.trim(),
      })),
      availabilityNote: form.availabilityNote.trim(),
      sortOrder: Number(form.sortOrder),
      vivaMinutes: Number(form.vivaMinutes),
      featureBullets: form.featureBulletsText
        .split("\n")
        .map((item) => item.trim())
        .filter(Boolean),
      isActive: form.isActive,
      eligibleCouponIds: form.eligibleCouponIds,
      marketingCouponId: form.marketingCouponId,
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

    if (!Number.isInteger(payload.categorySortOrder) || payload.categorySortOrder < 0) {
      toast.error("Category sort order must be a non-negative integer");
      return;
    }

    if (!Number.isInteger(payload.sortOrder) || payload.sortOrder < 0) {
      toast.error("Plan sort order must be a non-negative integer");
      return;
    }

    if (payload.versions.length === 0) {
      toast.error("Add at least one plan version");
      return;
    }

    if (
      payload.versions.some(
        (version) =>
          !Number.isFinite(version.price) ||
          version.price < 0 ||
          !Number.isFinite(version.months) ||
          version.months <= 0
      )
    ) {
      toast.error("Each version needs a valid month count and price");
      return;
    }

    try {
      setSaving(true);
      const res = await adminFetch(
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
      const res = await adminFetch(`/api/pricing-plans/${id}`, { method: "DELETE" });
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
      const res = await adminFetch("/api/pricing-plans/presets", { method: "POST" });
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
      const res = await adminFetch("/api/pricing-coupons", {
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
          isSecret: couponForm.isSecret,
          allowedPlanIds: couponForm.allowedPlanIds,
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
      const res = await adminFetch(`/api/pricing-coupons/${coupon.id}`, {
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
      const res = await adminFetch(`/api/pricing-coupons/${id}`, { method: "DELETE" });
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
    <div className="min-h-screen bg-slate-50 px-3 pb-3 pt-0 sm:px-4 sm:pb-4">
      <div className="mx-auto max-w-7xl">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="gap-3">
          <div className="sticky top-0 z-20 h-14 bg-slate-50/95 backdrop-blur">
            <TabsList className="grid !h-14 w-full grid-cols-5 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-sm">
              <TabsTrigger value="builder" className="h-12 min-w-0 gap-1.5 rounded-lg px-2 text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white sm:text-sm">
                <ClipboardList className="h-4 w-4" />
                <span className="truncate">1. Plan Details</span>
              </TabsTrigger>
              <TabsTrigger value="access" className="h-12 min-w-0 gap-1.5 rounded-lg px-2 text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white sm:text-sm">
                <Layers3 className="h-4 w-4" />
                <span className="truncate">2. Pick Access</span>
              </TabsTrigger>
              <TabsTrigger value="plans" className="h-12 min-w-0 gap-1.5 rounded-lg px-2 text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white sm:text-sm">
                <FolderOpen className="h-4 w-4" />
                <span className="truncate">Saved Plans</span>
              </TabsTrigger>
              <TabsTrigger value="coupons" className="h-12 min-w-0 gap-1.5 rounded-lg px-2 text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white sm:text-sm">
                <BadgePercent className="h-4 w-4" />
                <span className="truncate">Coupons</span>
              </TabsTrigger>
              <TabsTrigger value="waitlist" className="h-12 min-w-0 gap-1.5 rounded-lg px-2 text-xs data-[state=active]:bg-teal-600 data-[state=active]:text-white sm:text-sm">
                <Users className="h-4 w-4" />
                <span className="truncate">Waitlist ({waitlistResponses.length})</span>
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="builder" className="mx-auto w-full max-w-5xl">
            <div className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-teal-100 bg-teal-50 px-3 py-2">
              <p className="text-sm text-teal-800">Start with pricing and plan details, then continue to Pick Access.</p>
              <Button type="button" variant="outline" size="sm" onClick={resetForm} className="gap-2">
                <RotateCcw className="h-4 w-4" />
                Reset form
              </Button>
            </div>
            <PlanFormCard
              editingId={editingId}
              form={form}
              setForm={setForm}
              coupons={coupons}
              totalScopedGroups={totalScopedGroups}
              totalSelected={totalSelected}
              saving={saving}
              onSave={handleSave}
            />
            <div className="mt-3 flex justify-end">
              <Button type="button" onClick={() => setActiveTab("access")} className="bg-teal-600 text-white hover:bg-teal-700">
                Continue to pick access
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="access" className="space-y-3">
            <div className="flex flex-col gap-2 rounded-lg border border-teal-100 bg-teal-50 p-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-teal-900">Choose what this plan unlocks</p>
                <p className="text-sm text-teal-700">Pick whole courses first. Use advanced selection only for exceptions.</p>
              </div>
              <div className="text-sm font-medium text-teal-900">
                {totalScopedGroups} access groups · {totalSelected} individual items
              </div>
            </div>
            <PlanAccessScopePanel
              catalog={catalog}
              selectedScopes={form.accessScopes}
              onToggleScope={updateScopeSelection}
            />
            <details className="group rounded-2xl border border-slate-200 bg-white shadow-sm">
              <summary className="cursor-pointer list-none px-4 py-3 font-semibold text-slate-800">
                Optional: pick individual content
                <span className="ml-2 text-sm font-normal text-slate-500">({totalSelected} selected)</span>
              </summary>
              <div className="border-t border-slate-200 p-3">
                <PlanManualOverridePanel
                  catalog={filteredCatalog}
                  search={search}
                  onSearchChange={setSearch}
                  selectedContent={form.selectedContent}
                  onToggleSelection={updateSelection}
                />
              </div>
            </details>
            <div className="flex justify-end">
              <Button type="button" onClick={() => setActiveTab("builder")} className="bg-teal-600 text-white hover:bg-teal-700">
                Back to plan details
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="plans">
            <div className="mb-3 flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" size="sm" onClick={fetchData} className="gap-2">
                <RefreshCw className="h-4 w-4" />
                Refresh
              </Button>
              <Button
                type="button"
                size="sm"
                disabled={importingPresets}
                onClick={importPresets}
                className="bg-slate-900 text-white hover:bg-slate-800"
              >
                {importingPresets ? "Loading presets..." : "Load FRCS presets"}
              </Button>
            </div>
            <SavedPlansPanel
              plans={plans}
              loading={loading}
              onEdit={hydrateForm}
              onDelete={handleDelete}
              onCategoryOrderUpdated={fetchData}
            />
          </TabsContent>

          <TabsContent value="coupons">
            <CouponLauncherCard
              couponForm={couponForm}
              setCouponForm={setCouponForm}
              coupons={coupons}
              plans={plans}
              savingCoupon={savingCoupon}
              onCreateCoupon={handleCreateCoupon}
              onToggleCoupon={toggleCoupon}
              onDeleteCoupon={deleteCoupon}
            />
          </TabsContent>

          <TabsContent value="waitlist">
            <WaitlistResponsesPanel responses={waitlistResponses} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
