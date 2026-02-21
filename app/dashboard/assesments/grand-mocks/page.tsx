"use client";

import { useEffect, useState } from "react";
import { Plus, Clock, CalendarDays, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface Quiz {
  id: string;
  title: string;
  type: string;
  durationMinutes: number;
  createdAt?: any;
}

interface MockEvent {
  id: string;
  quizId: string;
  title: string;
  startTime: string;
  durationMinutes: number;
}

const formatDateTime = (value: any) => {
  if (!value) return "-";

  // Firestore Timestamp
  if (value._seconds) {
    return new Date(value._seconds * 1000).toLocaleString();
  }

  // If already Date object
  if (value instanceof Date) {
    return value.toLocaleString();
  }

  // If string
  return new Date(value).toLocaleString();
};

const GrandMockPage = () => {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [mocks, setMocks] = useState<MockEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  const [form, setForm] = useState({
    quizId: "",
    startTime: "",
    durationMinutes: "",
  });

  /* ───────── LOAD DATA ───────── */

  useEffect(() => {
    loadQuizzes();
    loadMocks();
  }, []);

  const loadQuizzes = async () => {
    try {
      const res = await fetch("/api/quizzes");
      const data = await res.json();

      const filtered = (data.quizzes || []).filter(
        (q: Quiz) =>
          q.type === "mock" || q.type === "grand-mock"
      );

      setQuizzes(filtered);
    } catch {
      toast.error("Failed to load quizzes");
    }
  };

  const loadMocks = async () => {
    try {
      const res = await fetch("/api/mocks");
      const data = await res.json();
      setMocks(data.mocks || []);
    } catch {
      toast.error("Failed to load mocks");
    } finally {
      setLoading(false);
    }
  };

  /* ───────── DERIVE STATUS ───────── */

 const deriveStatus = (mock: MockEvent) => {
  const now = Date.now();

  let start: number;

  // Firestore Timestamp
  if ((mock.startTime as any)?._seconds) {
    start = (mock.startTime as any)._seconds * 1000;
  }
  // ISO or datetime-local string
  else {
    start = new Date(mock.startTime).getTime();
  }

  if (!start || isNaN(start)) return "Scheduled";

  const end = start + Number(mock.durationMinutes) * 60 * 1000;

  if (now < start) return "Scheduled";
  if (now >= start && now <= end) return "Live";
  return "Completed";
};

  /* ───────── CREATE MOCK ───────── */

  const handleSave = async () => {
    if (!form.quizId || !form.startTime) {
      toast.error("Select quiz and start time");
      return;
    }

    try {
      const res = await fetch("/api/mocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quizId: form.quizId,
          startTime: form.startTime,
          durationMinutes: Number(form.durationMinutes),
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Mock scheduled");
      setDialogOpen(false);
      setForm({
        quizId: "",
        startTime: "",
        durationMinutes: "",
      });

      loadMocks();
    } catch {
      toast.error("Failed to create mock");
    }
  };

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">
          {mocks.length} mock events
        </p>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Mock
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>
                Schedule Mock Event
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-5 mt-4">

              {/* Select Quiz */}
              <div className="space-y-2">
                <Label>Select Quiz</Label>
                <Select
                  value={form.quizId}
                  onValueChange={(v) => {
                    const selected = quizzes.find(
                      (q) => q.id === v
                    );

                    setForm({
                      ...form,
                      quizId: v,
                      durationMinutes:
                        selected?.durationMinutes?.toString() || "",
                    });
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose quiz" />
                  </SelectTrigger>

                  <SelectContent>
                    {quizzes.map((quiz) => (
                      <SelectItem
                        key={quiz.id}
                        value={quiz.id}
                      >
                        {quiz.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Start Time */}
              <div className="space-y-2">
                <Label>Start Time</Label>
                <Input
                  type="datetime-local"
                  value={form.startTime}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      startTime: e.target.value,
                    })
                  }
                />
              </div>

              {/* Duration */}
              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      durationMinutes: e.target.value,
                    })
                  }
                />
              </div>

              <Button
                onClick={handleSave}
                className="w-full"
              >
                Save Mock
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* LIST */}
      {loading ? (
        <p className="text-sm text-muted-foreground">
          Loading...
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {mocks.map((mock) => (
            <div
  key={mock.id}
  onClick={() => router.push(`grand-mocks/${mock.id}`)}
  className="group relative w-full overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl"
>
  {/* Background Gradient Based On Status */}
  <div
    className={`absolute inset-0 opacity-10 ${
      deriveStatus(mock) === "Live"
        ? "bg-gradient-to-r from-emerald-500 to-green-400"
        : deriveStatus(mock) === "Scheduled"
        ? "bg-gradient-to-r from-blue-500 to-indigo-400"
        : "bg-gradient-to-r from-zinc-400 to-zinc-500"
    }`}
  />

  <div className="relative flex flex-col md:flex-row items-center justify-between p-6 gap-6">

    {/* LEFT STATUS BLOCK */}
    <div
      className={`flex items-center justify-center w-24 h-24 rounded-2xl text-white font-bold text-lg shadow-md ${
        deriveStatus(mock) === "Live"
          ? "bg-emerald-500 animate-pulse"
          : deriveStatus(mock) === "Scheduled"
          ? "bg-blue-500"
          : "bg-zinc-500"
      }`}
    >
      {deriveStatus(mock) === "Live"
        ? "LIVE"
        : deriveStatus(mock) === "Scheduled"
        ? "SOON"
        : "ENDED"}
    </div>

    {/* CENTER CONTENT */}
    <div className="flex-1 space-y-3 text-center md:text-left">

      <h3 className="text-xl font-semibold tracking-tight">
        {mock.title}
      </h3>

      <div className="flex flex-wrap items-center justify-center md:justify-start gap-6 text-sm text-muted-foreground">

        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4" />
          {formatDateTime(mock.startTime)}
        </span>

        <span className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {mock.durationMinutes} minutes
        </span>

        <span className="flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Quiz: {mock.quizId}
        </span>
      </div>
    </div>

    {/* RIGHT SIDE VISUAL */}
    <div className="text-center md:text-right space-y-1">
      <p className="text-4xl font-bold leading-none">
        {mock.durationMinutes}
      </p>
      <p className="text-xs uppercase tracking-widest text-muted-foreground">
        Minutes
      </p>
    </div>
  </div>
</div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GrandMockPage;