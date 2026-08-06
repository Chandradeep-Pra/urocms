"use client";

import { useEffect, useState } from "react";
import { Bell, Link2, MailQuestion, Send, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { adminFetch } from "@/lib/client/adminApi";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

type NotificationItem = {
  id: string;
  kind: string;
  title: string;
  body: string;
  deepLink?: string | null;
  publishedAt?: { _seconds?: number } | string | null;
};

type PaymentQueryItem = {
  id: string;
  title: string;
  body: string;
  name: string;
  email: string;
  planName: string;
  couponName: string;
  platform: "mobile" | "web";
  status: string;
  emailSent: boolean;
  createdAt?: { _seconds?: number } | string | null;
};

function formatNotificationDate(value: NotificationItem["publishedAt"]) {
  if (!value) return "Just now";
  if (typeof value === "object" && value?._seconds) {
    return new Date(value._seconds * 1000).toLocaleString();
  }
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? "Just now" : date.toLocaleString();
}

export default function NotificationManagerPage() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [deepLink, setDeepLink] = useState("");
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [paymentQueries, setPaymentQueries] = useState<PaymentQueryItem[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadNotifications() {
    try {
      const res = await adminFetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load notifications");
      setItems(data.notifications || []);
      setPaymentQueries(data.paymentQueries || []);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to load notifications");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function publishCustomNotification() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and notification text are required");
      return;
    }

    try {
      setSaving(true);
      const res = await adminFetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          body,
          deepLink,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to publish notification");

      toast.success("Notification published");
      setTitle("");
      setBody("");
      setDeepLink("");
      await loadNotifications();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to publish notification");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <Card className="rounded-3xl border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-cyan-600" />
            Custom Notification Creator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Notification title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <Textarea
            placeholder="Notification text"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex items-center gap-3">
            <Link2 className="h-4 w-4 text-slate-400" />
            <Input
              placeholder="Optional deep link, e.g. /daily-quiz"
              value={deepLink}
              onChange={(e) => setDeepLink(e.target.value)}
            />
          </div>
          <Button onClick={publishCustomNotification} disabled={saving} className="w-full">
            <Send className="mr-2 h-4 w-4" />
            {saving ? "Publishing..." : "Publish Notification"}
          </Button>
        </CardContent>
      </Card>

      <Card className="rounded-3xl border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MailQuestion className="h-5 w-5 text-amber-600" />
            Payment Queries
            {paymentQueries.length ? (
              <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
                {paymentQueries.length}
              </span>
            ) : null}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading payment queries...</p>
          ) : paymentQueries.length === 0 ? (
            <p className="text-sm text-slate-500">No payment queries raised yet.</p>
          ) : (
            <div className="space-y-3">
              {paymentQueries.map((item) => (
                <div key={item.id} className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-base font-semibold text-slate-900">{item.title}</p>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium text-amber-800">
                          {item.status}
                        </span>
                        <span className="rounded-full bg-white px-2 py-0.5 text-xs text-slate-600">
                          {item.platform}
                        </span>
                      </div>
                      <p className="text-sm text-slate-700">
                        {item.name} · {item.email}
                      </p>
                      <div className="grid gap-1 text-sm text-slate-600 sm:grid-cols-2">
                        <p><span className="font-medium text-slate-800">Plan:</span> {item.planName}</p>
                        <p><span className="font-medium text-slate-800">Coupon:</span> {item.couponName}</p>
                      </div>
                      <p className="rounded-xl bg-white p-3 text-sm leading-6 text-slate-700">{item.body}</p>
                      <p className="text-xs text-slate-500">
                        Confirmation email: {item.emailSent ? "sent" : "not sent"} · Reference: {item.id}
                      </p>
                    </div>
                    <p className="shrink-0 text-xs text-slate-500">
                      {formatNotificationDate(item.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="rounded-3xl border shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-cyan-600" />
            Published Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-slate-500">Loading notifications...</p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500">No notifications published yet.</p>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-cyan-700">
                        {item.kind}
                      </p>
                      <p className="text-base font-semibold text-slate-900">{item.title}</p>
                      <p className="text-sm leading-6 text-slate-600">{item.body}</p>
                      {item.deepLink ? (
                        <p className="text-xs text-slate-500">Deep link: {item.deepLink}</p>
                      ) : null}
                    </div>
                    <p className="shrink-0 text-xs text-slate-500">
                      {formatNotificationDate(item.publishedAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
