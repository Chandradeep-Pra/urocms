"use client";

import { useMemo, useState } from "react";
import {
  ArrowRight,
  BookOpen,
  Brain,
  CheckCircle2,
  ClipboardList,
  Crown,
  Lock,
  ShieldCheck,
  Sparkles,
  UserRoundCheck,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  APP_TIER_FLOW,
  FREE_CHAPTER_PREVIEW_LIMIT,
  getTierHeadline,
  getTierModules,
  type AppTier,
  type ModuleAccessState,
} from "@/lib/appAccess";

interface SimulatorSnapshot {
  debug: {
    firebaseProjectId: string | null;
    storageBucket: string | null;
    querySummary: Array<{
      key: string;
      label: string;
      count: number;
      empty: boolean;
    }>;
  };
  counts: {
    chapters: number;
    chapterTests: number;
    questionBanks: number;
    mocks: number;
    grandMocks: number;
    vivaCases: number;
    guestUsers: number;
    freeUsers: number;
    paidUsers: number;
  };
  chapters: Array<{
    id: string;
    title: string;
    difficulty: string;
    isPremium: boolean;
    estimatedTimeMin: number | null;
  }>;
}

const tierAccent: Record<AppTier, string> = {
  guest: "border-slate-300 bg-slate-100 text-slate-700",
  free: "border-amber-200 bg-amber-50 text-amber-800",
  paid: "border-teal-200 bg-teal-50 text-teal-800",
};

const tierButton: Record<AppTier, string> = {
  guest: "border-slate-300 bg-white text-slate-700 hover:bg-slate-50",
  free: "border-amber-200 bg-white text-amber-800 hover:bg-amber-50",
  paid: "border-teal-200 bg-white text-teal-800 hover:bg-teal-50",
};

const stateBadgeClass: Record<ModuleAccessState, string> = {
  action: "border-sky-200 bg-sky-50 text-sky-700",
  locked: "border-slate-200 bg-slate-100 text-slate-600",
  preview: "border-amber-200 bg-amber-50 text-amber-700",
  full: "border-emerald-200 bg-emerald-50 text-emerald-700",
};

const moduleIcon = {
  profile: UserRoundCheck,
  "chapter-quizzes": BookOpen,
  "mock-tests": ClipboardList,
  "grand-mocks": Sparkles,
  "ai-viva": Brain,
} as const;

function getStateLabel(state: ModuleAccessState) {
  switch (state) {
    case "action":
      return "Action";
    case "locked":
      return "Locked";
    case "preview":
      return "Preview";
    case "full":
      return "Unlocked";
  }
}

function getStateIcon(state: ModuleAccessState) {
  switch (state) {
    case "action":
      return ShieldCheck;
    case "locked":
      return Lock;
    case "preview":
      return Sparkles;
    case "full":
      return CheckCircle2;
  }
}

export default function AccessSimulatorClient({
  snapshot,
}: {
  snapshot: SimulatorSnapshot;
}) {
  const [selectedTier, setSelectedTier] = useState<AppTier>("free");

  const modules = useMemo(() => getTierModules(selectedTier), [selectedTier]);
  const headline = useMemo(() => getTierHeadline(selectedTier), [selectedTier]);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.14),_transparent_32%),linear-gradient(180deg,_#f8fafc_0%,_#ffffff_42%,_#ecfeff_100%)]">
      <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
        <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white/90 shadow-sm backdrop-blur">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.35fr_0.9fr] lg:px-8">
            <div className="space-y-5">
              <Badge className="rounded-full border border-teal-200 bg-teal-50 px-3 py-1 text-teal-700">
                React Native App Access Simulator
              </Badge>

              <div className="space-y-3">
                <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
                  Simulate what each mobile app user tier can access before we wire the final
                  gating everywhere.
                </h1>
                <p className="max-w-3xl text-sm leading-7 text-slate-600 sm:text-base">
                  This view uses the current admin content counts and applies the target flow you
                  described: guest to free to paid, with free users getting only a small chapter
                  quiz preview and premium assessments staying locked.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                {APP_TIER_FLOW.map((step) => (
                  <Button
                    key={step.tier}
                    type="button"
                    variant="outline"
                    className={`rounded-full px-4 ${
                      selectedTier === step.tier
                        ? tierAccent[step.tier]
                        : tierButton[step.tier]
                    }`}
                    onClick={() => setSelectedTier(step.tier)}
                  >
                    {step.label}
                  </Button>
                ))}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">
                  Selected Tier
                </p>
                <h2 className="mt-2 text-xl font-semibold text-slate-900">{headline.title}</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">{headline.description}</p>
              </div>
            </div>

            <Card className="border-slate-200 bg-slate-950 text-white shadow-none">
              <CardHeader className="space-y-3">
                <CardTitle className="text-xl">Live Content Snapshot</CardTitle>
                <CardDescription className="text-slate-300">
                  Pulled from the current CMS so the simulator reflects the app inventory.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Chapter Tests</p>
                  <p className="mt-2 text-3xl font-semibold">{snapshot.counts.chapterTests}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Question Banks</p>
                  <p className="mt-2 text-3xl font-semibold">{snapshot.counts.questionBanks}</p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">Mocks</p>
                  <p className="mt-2 text-3xl font-semibold">
                    {snapshot.counts.mocks + snapshot.counts.grandMocks}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">AI Viva Cases</p>
                  <p className="mt-2 text-3xl font-semibold">{snapshot.counts.vivaCases}</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="border-slate-200 bg-white/90 xl:col-span-2">
            <CardHeader>
              <CardTitle>Debug Snapshot</CardTitle>
              <CardDescription>
                Use this to compare what the local server is reading versus production.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Firebase Project
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-slate-800">
                    {snapshot.debug.firebaseProjectId || "Missing FIREBASE_PROJECT_ID"}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-400">
                    Storage Bucket
                  </p>
                  <p className="mt-2 break-all text-sm font-medium text-slate-800">
                    {snapshot.debug.storageBucket || "Missing FIREBASE_STORAGE_BUCKET"}
                  </p>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                {snapshot.debug.querySummary.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-2xl border p-4 ${
                      item.empty
                        ? "border-rose-200 bg-rose-50"
                        : "border-emerald-200 bg-emerald-50"
                    }`}
                  >
                    <p className="text-xs uppercase tracking-[0.16em] text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-slate-900">{item.count}</p>
                    <p className="mt-1 text-xs text-slate-600">
                      {item.empty ? "Returned 0 locally" : "Query returned data"}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/90">
            <CardHeader>
              <CardTitle>App Tier Flow</CardTitle>
              <CardDescription>
                The intended user progression from first sign-in to full unlock.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-3">
              {APP_TIER_FLOW.map((step, index) => (
                <div
                  key={step.tier}
                  className={`relative rounded-3xl border p-5 ${
                    selectedTier === step.tier
                      ? "border-teal-300 bg-teal-50 shadow-sm"
                      : "border-slate-200 bg-slate-50"
                  }`}
                >
                  <Badge className={`rounded-full border ${tierAccent[step.tier]}`}>
                    {step.label}
                  </Badge>
                  <p className="mt-4 text-sm leading-6 text-slate-600">{step.subtitle}</p>
                  {index < APP_TIER_FLOW.length - 1 && (
                    <ArrowRight className="mt-6 h-4 w-4 text-slate-400" />
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white/90">
            <CardHeader>
              <CardTitle>User Mix</CardTitle>
              <CardDescription>Current tier counts inside the `users` collection.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div>
                  <p className="font-medium text-slate-800">Guest</p>
                  <p className="text-sm text-slate-500">Anonymous or pre-profile users</p>
                </div>
                <span className="text-2xl font-semibold text-slate-900">
                  {snapshot.counts.guestUsers}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 p-4">
                <div>
                  <p className="font-medium text-amber-900">Free</p>
                  <p className="text-sm text-amber-700">Profile completed, preview access</p>
                </div>
                <span className="text-2xl font-semibold text-amber-900">
                  {snapshot.counts.freeUsers}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-2xl border border-teal-200 bg-teal-50 p-4">
                <div>
                  <p className="font-medium text-teal-900">Paid</p>
                  <p className="text-sm text-teal-700">Full platform access</p>
                </div>
                <span className="text-2xl font-semibold text-teal-900">
                  {snapshot.counts.paidUsers}
                </span>
              </div>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-6 xl:grid-cols-[0.92fr_1.08fr]">
          <Card className="overflow-hidden border-slate-200 bg-slate-950 text-white">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Crown className="h-5 w-5 text-amber-300" />
                Mobile App Preview
              </CardTitle>
              <CardDescription className="text-slate-300">
                Simulated home access for the selected tier.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mx-auto max-w-sm rounded-[32px] border border-white/10 bg-slate-900 p-4 shadow-2xl">
                <div className="rounded-[24px] bg-[linear-gradient(180deg,_rgba(20,184,166,0.18),_rgba(15,23,42,0.18))] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Current Tier</p>
                      <p className="mt-1 text-2xl font-semibold capitalize">{selectedTier}</p>
                    </div>
                    <Badge className={`rounded-full border ${tierAccent[selectedTier]}`}>
                      {selectedTier === "guest"
                        ? "Onboarding"
                        : selectedTier === "free"
                          ? "Preview"
                          : "Full access"}
                    </Badge>
                  </div>

                  <div className="mt-5 space-y-3">
                    {modules.map((module) => {
                      const Icon = moduleIcon[module.key as keyof typeof moduleIcon];
                      const StateIcon = getStateIcon(module.state);

                      return (
                        <div
                          key={module.key}
                          className="rounded-2xl border border-white/10 bg-white/5 p-4"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3">
                              <div className="rounded-xl bg-white/10 p-2">
                                <Icon className="h-4 w-4 text-white" />
                              </div>
                              <div>
                                <p className="font-medium text-white">{module.label}</p>
                                <p className="mt-1 text-sm leading-6 text-slate-300">
                                  {module.description}
                                </p>
                              </div>
                            </div>

                            <div
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-[11px] ${stateBadgeClass[module.state]}`}
                            >
                              <StateIcon className="h-3 w-3" />
                              {getStateLabel(module.state)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="border-slate-200 bg-white/90">
              <CardHeader>
                <CardTitle>Chapter Quiz Preview Rule</CardTitle>
                <CardDescription>
                  Free users should be able to sample chapter quizzes without unlocking the rest of
                  the product.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
                  <p className="text-sm font-medium text-amber-900">
                    Free-tier rule: allow only {FREE_CHAPTER_PREVIEW_LIMIT} questions from each
                    chapter quiz.
                  </p>
                  <p className="mt-2 text-sm leading-6 text-amber-800">
                    Free users also get a weekly hosted mock preview budget of 3 questions across
                    mocks and grand mocks. AI viva stays locked until paid.
                  </p>
                </div>

                <div className="grid gap-3 md:grid-cols-2">
                  {snapshot.chapters.length > 0 ? (
                    snapshot.chapters.map((chapter) => (
                      <div
                        key={chapter.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-medium text-slate-800">{chapter.title}</p>
                          <Badge
                            variant="outline"
                            className="rounded-full border-slate-200 bg-white text-slate-600"
                          >
                            {chapter.difficulty}
                          </Badge>
                        </div>
                        <p className="mt-3 text-sm text-slate-600">
                          Free user preview: {FREE_CHAPTER_PREVIEW_LIMIT} questions
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {chapter.estimatedTimeMin
                            ? `Estimated time ${chapter.estimatedTimeMin} min`
                            : "Estimated time not set"}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-sm text-slate-500">
                      No chapter test nodes found yet.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 bg-white/90">
              <CardHeader>
                <CardTitle>Access Matrix</CardTitle>
                <CardDescription>
                  Quick policy reference for what the mobile app should expose by tier.
                </CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="py-3 pr-4 font-medium">Feature</th>
                      <th className="px-4 py-3 font-medium">Guest</th>
                      <th className="px-4 py-3 font-medium">Free</th>
                      <th className="px-4 py-3 font-medium">Paid</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      {
                        label: "Profile completion",
                        values: ["Complete profile", "Done", "Done"],
                      },
                      {
                        label: "Chapter quizzes",
                        values: ["Locked", `${FREE_CHAPTER_PREVIEW_LIMIT} question preview`, "Full"],
                      },
                      {
                        label: "Mock tests",
                        values: ["Locked", "3 questions per week", "Full"],
                      },
                      {
                        label: "Grand mocks",
                        values: ["Locked", "3 questions per week", "Full"],
                      },
                      {
                        label: "AI viva",
                        values: ["Locked", "Locked", "Full"],
                      },
                    ].map((row) => (
                      <tr key={row.label} className="border-b border-slate-100 last:border-b-0">
                        <td className="py-3 pr-4 font-medium text-slate-800">{row.label}</td>
                        {row.values.map((value, index) => (
                          <td key={`${row.label}-${index}`} className="px-4 py-3 text-slate-600">
                            {value}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}
