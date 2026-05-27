"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Pencil, Quote, Trash2, Video } from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/client/adminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type Testimonial = {
  id: string;
  title: string;
  videoUrl: string;
  youtubeId: string;
  candidateName: string;
  candidateRole: string;
  quote: string;
  sortOrder: number;
  isActive: boolean;
};

type PublishableFeedback = {
  id: string;
  fullName: string;
  email: string;
  currentInstitute: string;
  currentRole: string;
  examTrack: string;
  feedback: string;
  submittedAt?: { _seconds?: number } | string | null;
};

type FormState = {
  title: string;
  videoUrl?: string;
  candidateName: string;
  candidateRole: string;
  quote: string;
  sortOrder: string;
  isActive: boolean;
};

const emptyForm: FormState = {
  title: "",
  videoUrl: "",
  candidateName: "",
  candidateRole: "",
  quote: "",
  sortOrder: "0",
  isActive: true,
};

export default function TestimonialsPage() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [publishableFeedback, setPublishableFeedback] = useState<PublishableFeedback[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const submitLabel = useMemo(() => {
    if (saving) {
      return editingId ? "Saving..." : "Publishing...";
    }

    return editingId ? "Save Changes" : "Create Testimonial";
  }, [editingId, saving]);

  async function loadTestimonials() {
    try {
      setLoading(true);
      const [testimonialsRes, feedbackRes] = await Promise.all([
        adminFetch("/api/testimonials"),
        adminFetch("/api/feedback-responses/publishable"),
      ]);

      const testimonialsData = await testimonialsRes.json();
      const feedbackData = await feedbackRes.json();

      setItems(
        Array.isArray(testimonialsData.testimonials)
          ? testimonialsData.testimonials
          : []
      );
      setPublishableFeedback(
        Array.isArray(feedbackData.responses) ? feedbackData.responses : []
      );
    } catch (error) {
      console.error(error);
      toast.error("Failed to load testimonials");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadTestimonials();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function startEdit(item: Testimonial) {
    setEditingId(item.id);
    setForm({
      title: item.title,
      videoUrl: item.videoUrl,
      candidateName: item.candidateName,
      candidateRole: item.candidateRole,
      quote: item.quote,
      sortOrder: String(item.sortOrder ?? 0),
      isActive: item.isActive,
    });
  }

  function resetForm() {
    setEditingId(null);
    setForm(emptyForm);
  }

  function useFeedbackAsDraft(item: PublishableFeedback) {
    setEditingId(null);
    setForm({
      title:
        item.examTrack && item.currentRole
          ? `${item.examTrack} feedback from ${item.fullName}`
          : `Candidate feedback from ${item.fullName}`,
      videoUrl: "",
      candidateName: item.fullName,
      candidateRole: [item.currentRole, item.examTrack].filter(Boolean).join(" • "),
      quote: item.feedback,
      sortOrder: "0",
      isActive: true,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function saveTestimonial() {
    if (!form.title.trim() && !form.candidateName.trim()) {
      toast.error("Add either a card title or candidate name");
      return;
    }

    if (!form.quote.trim()) {
      toast.error("Quote is required");
      return;
    }

   

    const payload = {
      title: form.title,
      candidateName: form.candidateName,
      candidateRole: form.candidateRole,
      quote: form.quote,
      sortOrder: Number(form.sortOrder) || 0,
      isActive: form.isActive,
    };

    if (form.videoUrl?.trim()) {
      Object.assign(payload, { videoUrl: form.videoUrl.trim() });
    }

    const toastId = toast.loading(editingId ? "Saving testimonial..." : "Creating testimonial...");

    try {
      setSaving(true);
      const res = await adminFetch(editingId ? `/api/testimonials/${editingId}` : "/api/testimonials", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to save testimonial");
      }

      toast.success(editingId ? "Testimonial updated" : "Testimonial created", {
        id: toastId,
      });
      resetForm();
      await loadTestimonials();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save testimonial", {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  }

  async function removeTestimonial(id: string) {
    const toastId = toast.loading("Deleting testimonial...");

    try {
      const res = await adminFetch(`/api/testimonials/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Failed to delete testimonial");
      }

      toast.success("Testimonial deleted", { id: toastId });
      if (editingId === id) {
        resetForm();
      }
      await loadTestimonials();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete testimonial", {
        id: toastId,
      });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Testimonials</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage the candidate success story videos shown on the landing page.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="rounded-3xl border shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                {editingId ? "Edit Testimonial" : "Create Testimonial"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Create a quote-only testimonial or attach a YouTube video if you have one.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-title">Card Title</Label>
              <Input
                id="testimonial-title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="Optional title, e.g. Passed FRCS Urology with structured prep"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-video">YouTube URL (optional)</Label>
              <Input
                id="testimonial-video"
                value={form.videoUrl}
                onChange={(e) => update("videoUrl", e.target.value)}
                placeholder="https://www.youtube.com/watch?v=... or leave blank"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="testimonial-name">Candidate Name</Label>
                <Input
                  id="testimonial-name"
                  value={form.candidateName}
                  onChange={(e) => update("candidateName", e.target.value)}
                  placeholder="Dr Jane Doe"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="testimonial-role">Candidate Role</Label>
                <Input
                  id="testimonial-role"
                  value={form.candidateRole}
                  onChange={(e) => update("candidateRole", e.target.value)}
                  placeholder="FRCS Urology Candidate"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="testimonial-quote">Short Quote</Label>
              <Textarea
                id="testimonial-quote"
                rows={4}
                value={form.quote}
                onChange={(e) => update("quote", e.target.value)}
                placeholder="What stood out in the learning experience?"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
              <div className="space-y-2">
                <Label htmlFor="testimonial-order">Sort Order</Label>
                <Input
                  id="testimonial-order"
                  type="number"
                  value={form.sortOrder}
                  onChange={(e) => update("sortOrder", e.target.value)}
                />
              </div>

              <div className="flex items-center justify-between rounded-2xl border border-slate-200 px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-slate-900">Active on landing page</p>
                  <p className="text-xs text-slate-500">
                    Turn this off to hide the testimonial without deleting it.
                  </p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => update("isActive", checked)}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={saveTestimonial} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {submitLabel}
              </Button>
              {editingId ? (
                <Button type="button" variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {publishableFeedback.length > 0 ? (
            <Card className="rounded-3xl border border-emerald-200 bg-emerald-50/60 shadow-sm">
              <CardContent className="space-y-4 p-5">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">
                    Candidate Feedback Ready For Testimonials
                  </h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Use any submitted response to prefill the testimonial form, then publish it as either a quote-only testimonial or add a YouTube video.
                  </p>
                </div>

                <div className="space-y-3">
                  {publishableFeedback.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-emerald-200 bg-white p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-900">
                            {item.fullName}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            {[item.currentRole, item.examTrack, item.currentInstitute]
                              .filter(Boolean)
                              .join(" • ") || item.email}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => useFeedbackAsDraft(item)}
                        >
                          Use in Form
                        </Button>
                      </div>

                      <p className="mt-3 line-clamp-4 text-sm leading-6 text-slate-700">
                        {item.feedback}
                      </p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ) : null}

          {loading ? (
            <Card className="rounded-3xl border shadow-sm">
              <CardContent className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </CardContent>
            </Card>
          ) : items.length === 0 ? (
            <Card className="rounded-3xl border shadow-sm">
              <CardContent className="py-16 text-center">
                <p className="text-lg font-medium text-slate-900">No testimonials yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Create your first candidate video testimonial to show it on the landing page.
                </p>
              </CardContent>
            </Card>
          ) : (
            items.map((item) => (
              <Card key={item.id} className="overflow-hidden rounded-3xl border shadow-sm">
                <CardContent className="grid gap-0 p-0 md:grid-cols-[280px_minmax(0,1fr)]">
                  {item.youtubeId ? (
                    <div className="relative aspect-video bg-slate-100">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`https://img.youtube.com/vi/${item.youtubeId}/hqdefault.jpg`}
                        alt={item.title}
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute inset-0 bg-slate-950/15" />
                      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-900">
                        <Video className="h-3.5 w-3.5" />
                        Video Testimonial
                      </div>
                    </div>
                  ) : (
                    <div className="relative flex min-h-[220px] items-end overflow-hidden bg-slate-50 p-6">
                      <span className="pointer-events-none absolute left-3 top-0 text-[180px] font-black leading-none text-slate-100">
                        "
                      </span>
                      <div className="absolute bottom-0 right-0 h-28 w-28 rounded-full bg-cyan-100/70" />
                      <div className="relative">
                        <div className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-700 shadow-sm">
                          <Quote className="h-3.5 w-3.5" />
                          Quote Testimonial
                        </div>
                        <p className="mt-4 line-clamp-5 text-sm leading-7 text-slate-700">
                          {item.quote}
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="space-y-4 p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.candidateName || "Candidate"}{item.candidateRole ? ` • ${item.candidateRole}` : ""}
                        </p>
                      </div>
                      <div className="rounded-full border border-slate-200 px-3 py-1 text-xs font-medium text-slate-600">
                        {item.isActive ? "Active" : "Hidden"}
                      </div>
                    </div>

                    <p className="text-sm leading-6 text-slate-600">
                      {item.quote || "No quote added yet."}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Sort order: {item.sortOrder}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        {item.youtubeId ? "Video" : "Quote only"}
                      </span>
                      {item.videoUrl ? (
                        <a
                          href={item.videoUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded-full bg-slate-100 px-3 py-1 text-slate-700 hover:bg-slate-200"
                        >
                          Open Video
                        </a>
                      ) : null}
                    </div>

                    <div className="flex gap-2">
                      <Button type="button" variant="outline" onClick={() => startEdit(item)}>
                        <Pencil className="mr-2 h-4 w-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => {
                          void removeTestimonial(item.id);
                        }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
