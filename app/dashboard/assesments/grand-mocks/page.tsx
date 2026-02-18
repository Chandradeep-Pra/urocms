"use client"

import { useState } from "react";
import { Plus, Trophy, Clock, CalendarDays, Users } from "lucide-react";
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
import { toast } from "sonner";

interface GrandMock {
  id: string;
  title: string;
  liveDateTime: string;
  questionCount: number;
  duration: number;
  status: "scheduled" | "live" | "completed";
  participants: number;
}

const mockData: GrandMock[] = [
  { id: "1", title: "Grand Mock #1 — Full Urology", liveDateTime: "2025-03-01T10:00", questionCount: 200, duration: 180, status: "scheduled", participants: 0 },
  { id: "2", title: "Grand Mock #2 — Renal Focus", liveDateTime: "2025-02-15T14:00", questionCount: 150, duration: 120, status: "live", participants: 342 },
  { id: "3", title: "Grand Mock #3 — Anatomy", liveDateTime: "2025-01-20T09:00", questionCount: 100, duration: 90, status: "completed", participants: 512 },
];

const statusStyles: Record<string, string> = {
  scheduled: "bg-info/10 text-info border-info/20",
  live: "bg-accent/10 text-accent border-accent/20",
  completed: "bg-muted text-muted-foreground border-border",
};

const GrandMockTestsPage = () => {
  const [tests, setTests] = useState(mockData);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ title: "", liveDateTime: "", duration: "120" });

  const handleSave = () => {
    if (!form.title || !form.liveDateTime) { toast.error("Fill all fields"); return; }
    setTests((prev) => [...prev, {
      id: Date.now().toString(),
      title: form.title,
      liveDateTime: form.liveDateTime,
      questionCount: 0,
      duration: parseInt(form.duration),
      status: "scheduled",
      participants: 0,
    }]);
    setDialogOpen(false);
    setForm({ title: "", liveDateTime: "", duration: "120" });
    toast.success("Grand Mock created");
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-muted-foreground">{tests.length} grand mock tests</p>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
  <DialogTrigger asChild>
    <Button className="bg-gradient-to-r from-teal-600 to-blue-600 hover:opacity-90 text-white shadow-md">
      <Plus className="mr-2 h-4 w-4" />
      Create Grand Mock
    </Button>
  </DialogTrigger>

  <DialogContent className="sm:max-w-lg rounded-2xl border border-slate-200 bg-white p-0 overflow-hidden">

    {/* HEADER */}
    <div className="px-6 py-6 border-b border-slate-100 bg-gradient-to-r from-teal-50 to-blue-50">
      <DialogHeader>
        <DialogTitle className="text-xl font-semibold text-slate-800">
          Create Grand Mock Test
        </DialogTitle>
        <p className="text-sm text-slate-600 mt-1">
          Schedule a live exam event for all participants.
        </p>
      </DialogHeader>
    </div>

    {/* BODY */}
    <div className="px-6 py-6 space-y-6">

      {/* Title */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">
          Grand Mock Title
        </Label>
        <Input
          value={form.title}
          onChange={(e) =>
            setForm({ ...form, title: e.target.value })
          }
          placeholder="e.g. National Urology Grand Mock – March 2026"
          className="border-slate-200 focus:border-teal-500 focus:ring-teal-500"
        />
      </div>

      {/* Live Date */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">
          Live Date & Time
        </Label>

        <div className="flex items-center rounded-xl border border-slate-200 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 px-3 bg-white">
          <span className="text-slate-400 text-sm mr-2">📅</span>
          <Input
            type="datetime-local"
            value={form.liveDateTime}
            onChange={(e) =>
              setForm({
                ...form,
                liveDateTime: e.target.value,
              })
            }
            className="border-0 focus-visible:ring-0 bg-transparent"
          />
        </div>

        <p className="text-xs text-slate-500">
          The test will automatically go live at this time.
        </p>
      </div>

      {/* Duration */}
      <div className="space-y-2">
        <Label className="text-sm font-medium text-slate-700">
          Duration
        </Label>

        <div className="flex items-center rounded-xl border border-slate-200 focus-within:border-teal-500 focus-within:ring-1 focus-within:ring-teal-500 px-3 bg-white">
          <Input
            type="number"
            min="1"
            value={form.duration}
            onChange={(e) =>
              setForm({ ...form, duration: e.target.value })
            }
            className="border-0 focus-visible:ring-0 bg-transparent"
            placeholder="180"
          />
          <span className="text-slate-500 text-sm ml-2">
            minutes
          </span>
        </div>

        <p className="text-xs text-slate-500">
          Participants will have this much time once the test starts.
        </p>
      </div>

    </div>

    {/* FOOTER */}
    <div className="px-6 py-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">

      <Button
        variant="ghost"
        onClick={() => setDialogOpen(false)}
        className="text-slate-600 hover:text-slate-800"
      >
        Cancel
      </Button>

      <Button
        onClick={handleSave}
        className="bg-gradient-to-r from-teal-600 to-blue-600 hover:opacity-90 text-white px-6 shadow-md"
      >
        Launch Grand Mock
      </Button>

    </div>
  </DialogContent>
</Dialog>

      </div>

      <div className="grid gap-4">
        {tests.map((test) => (
          <Card key={test.id} className={`shadow-sm border-l-4 ${test.status === "live" ? "border-l-accent" : test.status === "scheduled" ? "border-l-info" : "border-l-border"}`}>
            <CardContent className="p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-3">
                    <Trophy className={`h-5 w-5 ${test.status === "live" ? "text-accent" : "text-primary"}`} />
                    <h3 className="font-semibold text-foreground text-lg">{test.title}</h3>
                    <Badge variant="outline" className={statusStyles[test.status]}>{test.status}</Badge>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><CalendarDays className="h-4 w-4" /> {new Date(test.liveDateTime).toLocaleString()}</span>
                    <span className="flex items-center gap-1"><Clock className="h-4 w-4" /> {test.duration} min</span>
                    <span className="flex items-center gap-1"><Users className="h-4 w-4" /> {test.participants} participants</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-bold text-foreground">{test.questionCount}</p>
                  <p className="text-xs text-muted-foreground">questions</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default GrandMockTestsPage;
