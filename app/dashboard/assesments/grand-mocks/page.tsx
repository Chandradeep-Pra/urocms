"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  FileText,
  Plus,
  Users,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Quiz {
  id: string;
  title: string;
  type: string;
  durationMinutes: number;
}

interface MockAttempt {
  candidate: {
    name: string;
    email: string;
  };
  marks: number;
}

interface MockEvent {
  id: string;
  quizId: string;
  title: string;
  startTime: string;
  endTime?: string;
  durationMinutes: number;
  attempts?: MockAttempt[];
  attemptsCount?: number;
}

const formatDateTime = (value: any) => {
  if (!value) return "-";

  if (value._seconds) {
    return new Date(value._seconds * 1000).toLocaleString();
  }

  if (value instanceof Date) {
    return value.toLocaleString();
  }

  return new Date(value).toLocaleString();
};

const getTimestamp = (value: any) => {
  if (!value) return NaN;
  if (value._seconds) return value._seconds * 1000;
  return new Date(value).getTime();
};

export default function GrandMockPage() {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [mocks, setMocks] = useState<MockEvent[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [form, setForm] = useState({
    quizId: "",
    startTime: "",
    endTime: "",
    durationMinutes: "",
  });

  useEffect(() => {
    loadQuizzes();
    loadMocks();
  }, []);

  const loadQuizzes = async () => {
    try {
      const res = await fetch("/api/quizzes");
      const data = await res.json();

      const filtered = (data.quizzes || []).filter(
        (quiz: Quiz) => quiz.type === "mock" || quiz.type === "grand-mock"
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

  const deriveStatus = (mock: MockEvent) => {
    const now = Date.now();
    const start = getTimestamp(mock.startTime);
    const end = mock.endTime
      ? getTimestamp(mock.endTime)
      : start + Number(mock.durationMinutes) * 60 * 1000;

    if (!start || Number.isNaN(start)) return "Scheduled";
    if (now < start) return "Scheduled";
    if (now >= start && now <= end) return "Live";
    return "Completed";
  };

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
          endTime: form.endTime || null,
          durationMinutes: Number(form.durationMinutes),
        }),
      });

      if (!res.ok) throw new Error();

      toast.success("Mock scheduled");
      setDialogOpen(false);
      setForm({
        quizId: "",
        startTime: "",
        endTime: "",
        durationMinutes: "",
      });
      loadMocks();
    } catch {
      toast.error("Failed to create mock");
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{mocks.length} mock events</p>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Schedule Mock
            </Button>
          </DialogTrigger>

          <DialogContent className="sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Schedule Mock Event</DialogTitle>
            </DialogHeader>

            <div className="mt-4 space-y-5">
              <div className="space-y-2">
                <Label>Select Quiz</Label>
                <Select
                  value={form.quizId}
                  onValueChange={(value) => {
                    const selected = quizzes.find((quiz) => quiz.id === value);

                    setForm((prev) => ({
                      ...prev,
                      quizId: value,
                      durationMinutes:
                        selected?.durationMinutes?.toString() || "",
                    }));
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose quiz" />
                  </SelectTrigger>

                  <SelectContent>
                    {quizzes.map((quiz) => (
                      <SelectItem key={quiz.id} value={quiz.id}>
                        {quiz.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-5 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.startTime}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        startTime: e.target.value,
                      }))
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Input
                    type="datetime-local"
                    value={form.endTime}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        endTime: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Duration (minutes)</Label>
                <Input
                  type="number"
                  value={form.durationMinutes}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      durationMinutes: e.target.value,
                    }))
                  }
                />
              </div>

              <Button onClick={handleSave} className="w-full">
                Save Mock
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading...</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {mocks.map((mock) => {
            const attemptsCount = Array.isArray(mock.attempts)
              ? mock.attempts.length
              : mock.attemptsCount || 0;

            return (
              <div
                key={mock.id}
                onClick={() =>
                  router.push(`/dashboard/assesments/grand-mocks/${mock.id}`)
                }
                className="group relative w-full cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-xl"
              >
                <div
                  className={`absolute inset-0 opacity-10 ${
                    deriveStatus(mock) === "Live"
                      ? "bg-gradient-to-r from-emerald-500 to-green-400"
                      : deriveStatus(mock) === "Scheduled"
                      ? "bg-gradient-to-r from-blue-500 to-indigo-400"
                      : "bg-gradient-to-r from-zinc-400 to-zinc-500"
                  }`}
                />

                <div className="relative flex flex-col items-center justify-between gap-6 p-6 md:flex-row">
                  <div
                    className={`flex h-24 w-24 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-md ${
                      deriveStatus(mock) === "Live"
                        ? "animate-pulse bg-emerald-500"
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

                  <div className="flex-1 space-y-3 text-center md:text-left">
                    <h3 className="text-xl font-semibold tracking-tight">
                      {mock.title}
                    </h3>

                    <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-muted-foreground md:justify-start">
                      <span className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4" />
                        {formatDateTime(mock.startTime)}
                      </span>

                      <span className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {mock.endTime
                          ? formatDateTime(mock.endTime)
                          : `${mock.durationMinutes} minutes`}
                      </span>

                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Quiz: {mock.quizId}
                      </span>

                      <span className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {attemptsCount} attempted
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1 text-center md:text-right">
                    <p className="text-4xl font-bold leading-none">
                      {attemptsCount}
                    </p>
                    <p className="text-xs uppercase tracking-widest text-muted-foreground">
                      Attempts
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
