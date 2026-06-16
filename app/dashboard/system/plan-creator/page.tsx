"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/client/adminApi";
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
import { PlanCreatorHeader } from "@/components/dashboard/plan-creator/PlanCreatorHeader";
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
      versions: fallbackVersions.map((version, index) =>
        createEmptyPlanVersion(Number(version.months || 3), {
          id: String(version.id || `version-${index + 1}`),
          price: String(version.price ?? version.originalPrice ?? ""),
          couponId: version.couponId || "",
          embeddedLink: version.embeddedLink || "",
          durationLabel: version.durationLabel || "",
          billingLabel: version.billingLabel || "",
        })
      ),
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
  };

  const handleSave = async () => {
    const payload = {
      name: form.name.trim(),
      description: form.description.trim(),
      tag: form.tag.trim(),
      category: form.category.trim(),
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
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        <PlanCreatorHeader
          onRefresh={fetchData}
          onReset={resetForm}
          onImportPresets={importPresets}
          importingPresets={importingPresets}
        />

        <WaitlistResponsesPanel responses={waitlistResponses} />

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="space-y-6">
            <PlanAccessScopePanel
              catalog={catalog}
              selectedScopes={form.accessScopes}
              onToggleScope={updateScopeSelection}
            />
            <PlanManualOverridePanel
              catalog={filteredCatalog}
              search={search}
              onSearchChange={setSearch}
              selectedContent={form.selectedContent}
              onToggleSelection={updateSelection}
            />
          </div>

          <div className="space-y-6">
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
            <SavedPlansPanel plans={plans} loading={loading} onEdit={hydrateForm} onDelete={handleDelete} />
            <CouponLauncherCard
              couponForm={couponForm}
              setCouponForm={setCouponForm}
              coupons={coupons}
              savingCoupon={savingCoupon}
              onCreateCoupon={handleCreateCoupon}
              onToggleCoupon={toggleCoupon}
              onDeleteCoupon={deleteCoupon}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
