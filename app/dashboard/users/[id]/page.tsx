import Link from "next/link";
import { ArrowLeft, Brain, FileText, Trophy, UserRound } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getAdminUserProfile } from "@/lib/server/userProfileService";

export const dynamic = "force-dynamic";

function formatDate(value: string | null) {
  if (!value) return "-";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return "-";
  return parsed.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatPercent(value: number | null) {
  if (value === null || !Number.isFinite(value)) return "-";
  return `${value.toFixed(2)}%`;
}

function formatDuration(seconds: number | null) {
  if (seconds === null || !Number.isFinite(seconds)) return "-";
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}m ${secs}s`;
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
}: {
  title: string;
  value: string | number;
  description: string;
  icon: typeof Trophy;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardContent className="flex items-start justify-between gap-4 p-5">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
            {title}
          </p>
          <p className="mt-3 text-2xl font-semibold text-slate-900">{value}</p>
          <p className="mt-2 text-sm text-slate-500">{description}</p>
        </div>
        <div className="rounded-2xl bg-cyan-50 p-3 text-cyan-700">
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

function AttemptTable({
  title,
  emptyText,
  columns,
  rows,
}: {
  title: string;
  emptyText: string;
  columns: string[];
  rows: React.ReactNode;
}) {
  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg text-slate-900">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-hidden rounded-2xl border border-slate-200">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50">
                {columns.map((column) => (
                  <TableHead key={column}>{column}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>{rows}</TableBody>
          </Table>
        </div>
        {rows === null ? (
          <p className="mt-4 text-sm text-slate-500">{emptyText}</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getAdminUserProfile(id);

  if (!profile) {
    return (
      <div className="space-y-6">
        <Button asChild variant="outline" className="border-slate-200">
          <Link href="/dashboard/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>
        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-8 text-sm text-slate-500">User not found.</CardContent>
        </Card>
      </div>
    );
  }

  const { user, stats, vivaCredit, quizAttempts, mockAttempts, vivaAttempts } = profile;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <Button asChild variant="outline" className="w-fit border-slate-200">
          <Link href="/dashboard/users">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Users
          </Link>
        </Button>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="space-y-5 p-6">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-cyan-600">
                  User Profile
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">
                  {user.name}
                </h1>
                <p className="mt-2 text-sm text-slate-500">{user.email}</p>
                <div className="mt-4 grid gap-3 text-sm text-slate-600 sm:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Phone Number
                    </p>
                    <p className="mt-1 font-medium text-slate-800">{user.phone || "-"}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                      Medical Institution
                    </p>
                    <p className="mt-1 font-medium text-slate-800">
                      {user.medicalInstitution || "-"}
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge className="bg-slate-900 text-white">{user.tier}</Badge>
                  <Badge variant="outline" className="border-cyan-200 bg-cyan-50 text-cyan-700">
                    {user.activePlanStatus}
                  </Badge>
                  {user.source ? (
                    <Badge variant="outline" className="border-slate-200 text-slate-600">
                      {user.source}
                    </Badge>
                  ) : null}
                </div>
              </div>

              <div className="grid gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Created
                  </p>
                  <p className="mt-1">{formatDate(user.createdAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Updated
                  </p>
                  <p className="mt-1">{formatDate(user.updatedAt)}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Active Courses
                  </p>
                  <p className="mt-1">{user.activeCourses.length}</p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">
                    Viva Minutes Used
                  </p>
                  <p className="mt-1">{user.vivaMinutesUsed}</p>
                </div>
              </div>
            </div>

            <div className="rounded-3xl border border-cyan-100 bg-cyan-50/60 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-900">AI Viva Credit</p>
                  <p className="text-sm text-slate-500">
                    {vivaCredit.remainingMinutes} of {vivaCredit.totalMinutes} minute(s) remaining
                  </p>
                </div>
                <Badge variant="outline" className="w-fit border-cyan-200 text-cyan-700">
                  Used {vivaCredit.usedMinutes} minute(s)
                </Badge>
              </div>
              <Progress value={vivaCredit.percentRemaining} className="mt-4 h-3" />
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">Assigned Courses</p>
              {user.activeCourses.length ? (
                <div className="mt-3 flex flex-wrap gap-2">
                  {user.activeCourses.map((course) => (
                    <Badge key={course.id} variant="outline" className="border-slate-200 text-slate-700">
                      {course.title}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="mt-2 text-sm text-slate-500">No courses assigned yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Chapter Tests"
          value={stats.quizzesAttempted}
          description={`Avg score ${stats.averageQuizScore.toFixed(2)}`}
          icon={FileText}
        />
        <StatCard
          title="Mocks"
          value={stats.mocksAttempted}
          description={`Avg score ${stats.averageMockScore.toFixed(2)}`}
          icon={Trophy}
        />
        <StatCard
          title="Grand Mocks"
          value={stats.grandMocksAttempted}
          description={`Best mock ${stats.bestMockScore.toFixed(2)}`}
          icon={UserRound}
        />
        <StatCard
          title="AI Viva"
          value={stats.vivaAttempts}
          description={`Last activity ${formatDate(stats.lastActivityAt)}`}
          icon={Brain}
        />
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Chapter Test Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            {quizAttempts.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Test</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Percent</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {quizAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-slate-900">{attempt.title}</p>
                            <p className="text-xs text-slate-500">{attempt.type}</p>
                          </div>
                        </TableCell>
                        <TableCell>{attempt.score ?? "-"}</TableCell>
                        <TableCell>{formatPercent(attempt.percent)}</TableCell>
                        <TableCell>{formatDate(attempt.submittedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No chapter test attempts recorded yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg text-slate-900">Mock & Grand Mock Records</CardTitle>
          </CardHeader>
          <CardContent>
            {mockAttempts.length ? (
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead>Assessment</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Percent</TableHead>
                      <TableHead>Submitted</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockAttempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell>
                          <p className="font-medium text-slate-900">{attempt.title}</p>
                        </TableCell>
                        <TableCell className="capitalize">{attempt.type}</TableCell>
                        <TableCell>{attempt.score ?? "-"}</TableCell>
                        <TableCell>{formatPercent(attempt.percent)}</TableCell>
                        <TableCell>{formatDate(attempt.submittedAt)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No mock attempts recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg text-slate-900">AI Viva Attempts</CardTitle>
        </CardHeader>
        <CardContent>
          {vivaAttempts.length ? (
            <div className="overflow-hidden rounded-2xl border border-slate-200">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Case</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vivaAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <p className="font-medium text-slate-900">{attempt.caseTitle}</p>
                      </TableCell>
                      <TableCell>{attempt.mode || "-"}</TableCell>
                      <TableCell>{attempt.score ?? "-"}</TableCell>
                      <TableCell>{formatDuration(attempt.durationSeconds)}</TableCell>
                      <TableCell>{formatDate(attempt.submittedAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No AI viva attempts recorded yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
