import { Progress } from "@/components/ui/progress";
import type { Attempt, PublicVivaParticipant } from "@/components/viva/types";

export function VivaUsageProgress({
  attempts = [],
  publicParticipants = [],
}: {
  attempts?: Attempt[];
  publicParticipants?: PublicVivaParticipant[];
}) {
  const scoredAttempts = attempts.filter((attempt) => typeof attempt.report?.score === "number");
  const averageScore = scoredAttempts.length
    ? Math.round(scoredAttempts.reduce((sum, attempt) => sum + (attempt.report?.score || 0), 0) / scoredAttempts.length)
    : 0;
  const completionRate = attempts.length
    ? Math.round((scoredAttempts.length / attempts.length) * 100)
    : 0;

  return (
    <section className="space-y-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div>
        <h3 className="font-semibold text-slate-800">Viva Use Progress</h3>
        <p className="mt-1 text-sm text-slate-500">Candidate starts, completed reports and score progress.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Metric label="Total attempts" value={attempts.length} />
        <Metric label="Public starts" value={publicParticipants.length} />
        <Metric label="Average score" value={scoredAttempts.length ? `${averageScore}%` : "—"} />
      </div>

      <div className="space-y-2 rounded-2xl bg-slate-50 p-4">
        <div className="flex justify-between text-sm">
          <span className="font-medium text-slate-700">Report completion</span>
          <span className="text-slate-500">{completionRate}%</span>
        </div>
        <Progress value={completionRate} className="h-2.5" />
        <p className="text-xs text-slate-500">{scoredAttempts.length} of {attempts.length} attempts have a scored report.</p>
      </div>

      {scoredAttempts.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm font-semibold text-slate-700">Recent score progress</p>
          {scoredAttempts.slice(-8).map((attempt, index) => {
            const score = Math.max(0, Math.min(100, attempt.report?.score || 0));
            return (
              <div key={`${attempt.candidate.email}-${index}`} className="grid grid-cols-[minmax(120px,1fr)_2fr_44px] items-center gap-3 text-sm">
                <span className="truncate text-slate-600">{attempt.candidate.name || attempt.candidate.email}</span>
                <Progress value={score} className="h-2" />
                <span className="text-right font-medium text-slate-700">{score}%</span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-800">{value}</p>
    </div>
  );
}
