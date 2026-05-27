"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Copy,
  ExternalLink,
  Loader2,
  MessageSquare,
  Power,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/client/adminApi";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

type FeedbackFormItem = {
  id: string;
  title: string;
  description: string;
  token: string;
  isActive: boolean;
  allowMultipleResponses: boolean;
  submissionCount: number;
  lastSubmittedAt?: { _seconds?: number } | string | null;
  createdAt?: { _seconds?: number } | string | null;
};

type FeedbackResponseItem = {
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
  description: string;
  isActive: boolean;
  allowMultipleResponses: boolean;
};

const initialForm: FormState = {
  title: "",
  description: "",
  isActive: true,
  allowMultipleResponses: true,
};

function formatDate(value: FeedbackFormItem["createdAt"] | FeedbackResponseItem["submittedAt"]) {
  if (!value) return "—";
  if (typeof value === "object" && value?._seconds) {
    return new Date(value._seconds * 1000).toLocaleString();
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "—" : date.toLocaleString();
}

export default function FeedbackLinksPage() {
  const [items, setItems] = useState<FeedbackFormItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<FormState>(initialForm);
  const [selectedForm, setSelectedForm] = useState<FeedbackFormItem | null>(null);
  const [responses, setResponses] = useState<FeedbackResponseItem[]>([]);
  const [responsesOpen, setResponsesOpen] = useState(false);
  const [responsesLoading, setResponsesLoading] = useState(false);

  const publicBaseUrl = useMemo(() => {
    if (typeof window !== "undefined") {
      return window.location.origin;
    }

    return process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ?? "";
  }, []);

  async function loadForms() {
    try {
      setLoading(true);
      const res = await adminFetch("/api/feedback-forms", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load feedback forms");
      }
      setItems(Array.isArray(data.forms) ? data.forms : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load feedback forms");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadForms();
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function createForm() {
    if (!form.title.trim()) {
      toast.error("Form title is required");
      return;
    }

    const toastId = toast.loading("Creating feedback link...");

    try {
      setSaving(true);
      const res = await adminFetch("/api/feedback-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to create feedback form");
      }

      toast.success("Feedback link created", { id: toastId });
      setForm(initialForm);
      await loadForms();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create feedback link", {
        id: toastId,
      });
    } finally {
      setSaving(false);
    }
  }

  async function toggleStatus(item: FeedbackFormItem) {
    const toastId = toast.loading(item.isActive ? "Deactivating link..." : "Activating link...");

    try {
      const res = await adminFetch(`/api/feedback-forms/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to update link status");
      }
      toast.success(item.isActive ? "Link deactivated" : "Link activated", { id: toastId });
      await loadForms();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to update link status", {
        id: toastId,
      });
    }
  }

  async function viewResponses(item: FeedbackFormItem) {
    setResponsesOpen(true);
    setSelectedForm(item);
    setResponses([]);

    try {
      setResponsesLoading(true);
      const res = await adminFetch(`/api/feedback-forms/${item.id}`, {
        cache: "no-store",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || "Failed to load responses");
      }
      setResponses(Array.isArray(data.responses) ? data.responses : []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load responses");
    } finally {
      setResponsesLoading(false);
    }
  }

  async function deleteForm(item: FeedbackFormItem) {
    const toastId = toast.loading("Deleting feedback link...");

    try {
      const res = await adminFetch(`/api/feedback-forms/${item.id}`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error(data?.error || "Failed to delete feedback form");
      }

      toast.success("Feedback link deleted", { id: toastId });
      await loadForms();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to delete feedback link", {
        id: toastId,
      });
    }
  }

  function buildShareUrl(token: string) {
    return `${publicBaseUrl}/feedback/${token}`;
  }

  async function copyLink(token: string) {
    const url = buildShareUrl(token);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Unable to copy link");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Feedback Links</h1>
        <p className="mt-1 text-sm text-slate-500">
          Create a public candidate feedback link, share it anywhere, and control whether the link is active.
        </p>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="rounded-3xl border shadow-sm">
          <CardHeader>
            <CardTitle>Create Shareable Feedback Link</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="feedback-title">Form Title</Label>
              <Input
                id="feedback-title"
                value={form.title}
                onChange={(e) => update("title", e.target.value)}
                placeholder="FRCS Urology Candidate Feedback"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="feedback-description">Description</Label>
              <Textarea
                id="feedback-description"
                rows={4}
                value={form.description}
                onChange={(e) => update("description", e.target.value)}
                placeholder="Share this link with candidates so they can submit feedback without logging in."
              />
            </div>

            <div className="rounded-2xl border border-slate-200 p-4">
              <p className="text-sm font-medium text-slate-900">Candidate fields included</p>
              <p className="mt-2 text-sm text-slate-500">
                Full name, email, current institute/trust, current role, exam track, and feedback.
              </p>
            </div>

            <div className="space-y-4 rounded-2xl border border-slate-200 p-4">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Link active</p>
                  <p className="text-xs text-slate-500">Candidates can submit while this stays enabled.</p>
                </div>
                <Switch
                  checked={form.isActive}
                  onCheckedChange={(checked) => update("isActive", checked)}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-900">Allow multiple responses</p>
                  <p className="text-xs text-slate-500">Turn this off to allow only one response per email.</p>
                </div>
                <Switch
                  checked={form.allowMultipleResponses}
                  onCheckedChange={(checked) =>
                    update("allowMultipleResponses", checked)
                  }
                />
              </div>
            </div>

            <Button onClick={createForm} disabled={saving} className="w-full">
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              {saving ? "Creating..." : "Create Feedback Link"}
            </Button>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {loading ? (
            <Card className="rounded-3xl border shadow-sm">
              <CardContent className="flex items-center justify-center py-16">
                <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
              </CardContent>
            </Card>
          ) : items.length === 0 ? (
            <Card className="rounded-3xl border shadow-sm">
              <CardContent className="py-16 text-center">
                <p className="text-lg font-medium text-slate-900">No feedback links yet</p>
                <p className="mt-2 text-sm text-slate-500">
                  Create one from the form on the left and share it with candidates.
                </p>
              </CardContent>
            </Card>
          ) : (
            items.map((item) => {
              const shareUrl = buildShareUrl(item.token);

              return (
                <Card key={item.id} className="rounded-3xl border shadow-sm">
                  <CardContent className="space-y-4 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg font-semibold text-slate-900">{item.title}</h3>
                        <p className="mt-1 text-sm text-slate-500">
                          {item.description || "No description added."}
                        </p>
                      </div>
                      <div
                        className={`rounded-full px-3 py-1 text-xs font-medium ${
                          item.isActive
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </div>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                        Shareable link
                      </p>
                      <p className="mt-2 break-all text-sm text-slate-700">{shareUrl}</p>
                    </div>

                    <div className="flex flex-wrap gap-2 text-xs text-slate-500">
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Token: {item.token}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Submissions: {item.submissionCount}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Created: {formatDate(item.createdAt)}
                      </span>
                      <span className="rounded-full bg-slate-100 px-3 py-1">
                        Last submission: {formatDate(item.lastSubmittedAt)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => void copyLink(item.token)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Copy Link
                      </Button>

                      <Button type="button" variant="outline" asChild>
                        <a href={shareUrl} target="_blank" rel="noreferrer">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          Open
                        </a>
                      </Button>

                      <Button type="button" variant="outline" onClick={() => void viewResponses(item)}>
                        <MessageSquare className="mr-2 h-4 w-4" />
                        View Responses
                      </Button>

                      <Button type="button" variant="outline" onClick={() => void toggleStatus(item)}>
                        <Power className="mr-2 h-4 w-4" />
                        {item.isActive ? "Deactivate" : "Activate"}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        className="border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
                        onClick={() => void deleteForm(item)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>

      <Dialog open={responsesOpen} onOpenChange={setResponsesOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>
              {selectedForm ? `Responses: ${selectedForm.title}` : "Responses"}
            </DialogTitle>
          </DialogHeader>

          {responsesLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-5 w-5 animate-spin text-slate-500" />
            </div>
          ) : responses.length === 0 ? (
            <p className="py-12 text-center text-sm text-slate-500">
              No candidate responses yet.
            </p>
          ) : (
            <div className="max-h-[70vh] space-y-3 overflow-y-auto pr-2">
              {responses.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-base font-semibold text-slate-900">{item.fullName}</p>
                      <p className="mt-1 text-sm text-slate-500">{item.email}</p>
                    </div>
                    <p className="text-xs text-slate-500">{formatDate(item.submittedAt)}</p>
                  </div>

                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Current Institute / Trust
                      </p>
                      <p className="mt-1 text-sm text-slate-700">{item.currentInstitute || "—"}</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 p-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                        Current Role / Exam
                      </p>
                      <p className="mt-1 text-sm text-slate-700">
                        {[item.currentRole, item.examTrack].filter(Boolean).join(" • ") || "—"}
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 rounded-xl bg-slate-50 p-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
                      Feedback
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {item.feedback}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
