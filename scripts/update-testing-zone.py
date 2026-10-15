from pathlib import Path

root = Path(r'C:/Users/chand/Downloads/testing-zone')

def edit(path, old, new):
    target = root / path
    text = target.read_text(encoding='utf-8')
    if old not in text:
        raise RuntimeError(f'Missing replacement in {path}: {old[:70]}')
    target.write_text(text.replace(old, new, 1), encoding='utf-8')

edit('app/api/mocks/[id]/attempts/route.ts', '  marks?: number;', '  answers?: Record<string, number>;\n  marks?: number;')
edit('app/api/mocks/[id]/attempts/route.ts', '              marks: body.marks,', '              marks: body.marks,\n              answers: body.answers,')
edit('app/mocks/[id]/page.tsx', 'const savedVerification = localStorage.getItem("urologics-candidate-verification");', 'const savedVerification = localStorage.getItem("urologics-candidate-verification") || localStorage.getItem("mockUser");')
edit('app/mocks/[id]/page.tsx', '      localStorage.setItem(`mock-${id}-final`, JSON.stringify(answers));', '''      localStorage.setItem(`mock-${id}-final`, JSON.stringify(answers));
      if (!localStorage.getItem(`mock-${id}-first-final`)) {
        localStorage.setItem(`mock-${id}-first-final`, JSON.stringify(answers));
      }''')
edit('app/mocks/[id]/page.tsx', '            correctCount: marks,', '            answers,\n            correctCount: marks,')

# Reviewing is a read-only operation, including direct links and refreshes.
path = root / 'app/mocks/[id]/result/page.tsx'
text = path.read_text(encoding='utf-8')
text = text.replace('import toast from "react-hot-toast";', '')
text = text.replace('  const [submittedAttempt, setSubmittedAttempt] = useState(false);', '  const [hasSavedAnswers, setHasSavedAnswers] = useState(false);\n  const [recordedScore, setRecordedScore] = useState<number | null>(null);\n  const [error, setError] = useState("");')
start = text.index('      const res = await fetch(appPath(`/api/mocks/${id}`));')
end = text.index('\n    };', start)
text = text[:start] + '''      try {
        let res = await fetch(appPath(`/api/mocks/${id}`), { cache: "no-store" });
        if (res.status === 401) res = await fetch(appPath(`/api/public/mocks/${id}`), { cache: "no-store" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Unable to load this review");
        setMock(normalizeMock(data.mock));
        const attempt = data.mock?.userAttempt;
        if (attempt) setRecordedScore(Number(attempt.score ?? attempt.marks ?? 0));
        const saved = localStorage.getItem(`mock-${id}-first-final`) || localStorage.getItem(`mock-${id}-final`);
        const parsed = attempt?.answers ?? (saved ? JSON.parse(saved) : null);
        if (parsed && typeof parsed === "object") {
          setAnswers(Object.fromEntries(Object.entries(parsed).filter(([, value]) => Number.isInteger(value) && Number(value) >= 0).map(([key, value]) => [key, Number(value)])));
          setHasSavedAnswers(true);
        }
      } catch (error) {
        setError(error instanceof Error ? error.message : "Unable to load this review");
      }''' + text[end:]
start = text.index('  useEffect(() => {\n    if (!mock || submittedAttempt)')
end = text.index('\n  if (!mock) {', start)
text = text[:start] + text[end:]
text = text.replace('    return null;\n  }\n\n  return (', '    return <main className="urologics-shell min-h-screen p-8 text-center text-[var(--text-secondary)]">{error || "Loading answer review..."}</main>;\n  }\n\n  return (', 1)
text = text.replace('{score}/{mock.questions.length}', '{recordedScore ?? score}/{mock.questions.length}')
text = text.replace('          <section className="space-y-5">', '''          {!hasSavedAnswers && <div className="urologics-panel p-4 text-sm text-[var(--text-secondary)]">Your selected answers are unavailable for this earlier attempt. You can still review every correct answer and explanation below.</div>}
          <section className="space-y-5">''')
path.write_text(text, encoding='utf-8')

edit('app/mocks/page.tsx', '''    setSelectedMock(mock);
  };''', '''    if (mock.hasAttempted) {
      router.push(`/mocks/${mock.id}/result`);
      return;
    }
    setSelectedMock(mock);
  };''')
edit('app/mocks/page.tsx', '? "Reattempt Session"', '? "Review answers"')
edit('app/mocks/page.tsx', 'className="mt-1.5 line-clamp-2 text-sm leading-relaxed', 'className="mt-1.5 whitespace-pre-line text-sm leading-relaxed')
# Keep practice retakes available as a secondary action.
edit('app/mocks/page.tsx', '''                      </button>
                    </article>''', '''                      </button>
                      {mock.hasAttempted && isEntitled && <button type="button" className="mt-2 w-full rounded-full border border-[var(--border)] px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]" onClick={(event) => { event.stopPropagation(); setSelectedMock(mock); }}>Practice again</button>}
                    </article>''')
edit('app/mocks/page.tsx', 'You can start a fresh reattempt session below.', 'Practice again below. Your first attempt remains your ranked score.')
edit('components/overview/TestsTabSection.tsx', 'onClick={() => router.push(`/mocks/${m.id}/rules`)}', 'onClick={() => router.push(`/mocks/${m.id}/${m.hasAttempted ? "result" : "rules"}`)}')
edit('components/overview/TestsTabSection.tsx', '<Trophy size={11} /> Score:', '<Trophy size={11} /> Review answers · Score:')

edit('app/public-mocks/[id]/page.tsx', '''      if (alreadyAttempted) {
        toast.error("This email has already been used for this mock");
        return;
      }

''', '')
edit('app/public-mocks/[id]/page.tsx', '      router.push(`/mocks/${mock.id}/rules`);', '      router.push(`/mocks/${mock.id}/${alreadyAttempted ? "result" : "rules"}`);')

edit('lib/mocks.ts', '  accessType?: "private" | "public" | string;', '  description?: string;\n  accessType?: "private" | "public" | string;')
edit('lib/mocks.ts', '    accessType:\n', '    description: typeof source.description === "string" ? source.description : String(asRecord(source.quiz)?.description || ""),\n    accessType:\n')

# Fetch authenticated rankings with the same access checks as the mock itself.
target = root / 'app/api/mocks/[id]/results/route.ts'
target.parent.mkdir(parents=True, exist_ok=True)
target.write_text('''import { NextRequest, NextResponse } from "next/server";
import { getUrologicsApiUrl } from "@/lib/urologics-api";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const token = req.cookies.get("__session")?.value;
    const response = await fetch(getUrologicsApiUrl(`/api/${token ? "app" : "public"}/mocks/${encodeURIComponent(id)}/results`), {
      headers: token ? { Authorization: `Bearer ${token}` } : {}, cache: "no-store",
    });
    return NextResponse.json(await response.json(), { status: response.status, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) {
    console.error("Mock results proxy error:", error);
    return NextResponse.json({ error: "Unable to load rankings" }, { status: 500 });
  }
}
''', encoding='utf-8')

edit('app/api/public/mocks/[id]/results/route.ts', '// Deduplicate by student email/name keeping latest attempt only', '// Keep each candidate\'s first attempt.')
edit('app/api/public/mocks/[id]/results/route.ts', 'if (currentTime >= existingTime)', 'if (currentTime < existingTime)')
edit('app/api/public/mocks/[id]/results/route.ts', '    let previousMarks: number | null = null;\n    let previousRank = 0;\n\n', '')
edit('app/api/public/mocks/[id]/results/route.ts', '''      const rank = previousMarks === marks ? previousRank : index + 1;

      previousMarks = marks;
      previousRank = rank;''', '      const rank = index + 1;')

edit('app/mocks/[id]/rank/page.tsx', 'import { Trophy }', 'import { ArrowLeft, Medal, Trophy, Users }')
edit('app/mocks/[id]/rank/page.tsx', '  const [summary, setSummary] = useState<Summary | null>(null);', '  const [summary, setSummary] = useState<Summary | null>(null);\n  const [title, setTitle] = useState("Mock leaderboard");\n  const [error, setError] = useState("");')
edit('app/mocks/[id]/rank/page.tsx', '/api/public/mocks/${id}/results?_t=', '/api/mocks/${id}/results?_t=')
edit('app/mocks/[id]/rank/page.tsx', '''        if (Array.isArray(data?.results)) {''', '''        if (!res.ok) throw new Error(data.error || "Unable to load rankings");
        if (data.mock?.title) setTitle(data.mock.title);
        if (Array.isArray(data?.results)) {''')
edit('app/mocks/[id]/rank/page.tsx', '        console.error("Failed to load results:", error);', '        setError(error instanceof Error ? error.message : "Unable to load rankings");')
edit('app/mocks/[id]/rank/page.tsx', '  }));\n\n  const userEmail', '  })).sort((a, b) => a.rank - b.rank);\n\n  const userEmail')
edit('app/mocks/[id]/rank/page.tsx', '''  const latest = [...ranked]
    .sort((a, b) => {
      const timeA = Date.parse(a.submittedAt || a.createdAt || "") || 0;
      const timeB = Date.parse(b.submittedAt || b.createdAt || "") || 0;
      return timeB - timeA;
    })
    .slice(0, 10);''', '')
edit('app/mocks/[id]/rank/page.tsx', '''      <div className="mx-auto max-w-3xl space-y-8">
        <header className="text-center">
          <div className="urologics-chip">Leaderboard</div>
          <h1 className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">Your Rank</h1>
        </header>''', '''      <div className="mx-auto max-w-4xl space-y-6">
        <header className="relative overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] p-6 shadow-[0_16px_40px_var(--shadow-soft)] sm:p-9">
          <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-[var(--accent-soft)] blur-3xl" />
          <Link href="/mocks" className="relative inline-flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]"><ArrowLeft size={16} />Back to mocks</Link>
          <div className="relative mt-6 flex items-start gap-4">
            <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-[var(--accent-soft)] text-[var(--accent-strong)]"><Trophy size={27} /></div>
            <div className="min-w-0"><p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-strong)]">Leaderboard</p><h1 className="mt-2 break-words text-2xl font-semibold tracking-tight text-[var(--text-primary)] sm:text-3xl">{title}</h1><p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">Every first attempt counts. See where you stand.</p></div>
          </div>
          <div className="relative mt-6 flex flex-wrap gap-3 text-xs font-medium text-[var(--text-secondary)]">
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-3 py-2"><Users size={14} />{ranked.length} candidates</span>
            <span className="inline-flex items-center gap-2 rounded-full bg-[var(--surface-muted)] px-3 py-2"><Medal size={14} />First attempts only</span>
          </div>
        </header>
        {error && <p role="alert" className="rounded-2xl bg-rose-50 p-4 text-sm text-rose-700">{error}</p>}''')
edit('app/mocks/[id]/rank/page.tsx', '{me && summary && (', '{me && (')
edit('app/mocks/[id]/rank/page.tsx', '''              totalQuestions: summary.total,
              correct: summary.correct,
              wrong: summary.wrong,
              skipped: summary.skipped,''', '''              totalQuestions: me.maxMarks ?? summary?.total ?? 0,''')
edit('app/mocks/[id]/rank/page.tsx', 'className="flex items-end justify-center gap-3"', 'className="flex items-end justify-center gap-2 rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] px-3 pt-7 sm:gap-5 sm:px-8"')
edit('app/mocks/[id]/rank/page.tsx', 'className="w-1/3 text-center"', 'className="min-w-0 w-1/3 text-center"')
edit('app/mocks/[id]/rank/page.tsx', '            Last 10 attendees', '            Candidate rankings')
edit('app/mocks/[id]/rank/page.tsx', '<table className="w-full text-left text-sm">', '<div className="overflow-x-auto"><table className="w-full text-left text-sm">')
edit('app/mocks/[id]/rank/page.tsx', '          </table>', '          </table></div>')
edit('app/mocks/[id]/rank/page.tsx', '{latest.length === 0', '{ranked.length === 0')
edit('app/mocks/[id]/rank/page.tsx', '{latest.map((row)', '{ranked.map((row)')

# The rank summary must use the ranked score, never a later practice run's details.
target = root / 'components/ui/YourRankCard.tsx'
target.write_text('''import { Trophy } from "lucide-react";

export type YourRankStats = {
  rank: number; totalAttendees: number; marks: number; totalQuestions: number;
  correct?: number; wrong?: number; skipped?: number;
};

export default function YourRankCard({ stats }: { stats: YourRankStats }) {
  const percentage = stats.totalQuestions > 0 ? Math.round(stats.marks / stats.totalQuestions * 100) : null;
  const topPercent = Math.max(1, Math.ceil(stats.rank / Math.max(stats.totalAttendees, 1) * 100));
  const items = [
    { label: "First attempt score", value: stats.totalQuestions > 0 ? `${stats.marks} / ${stats.totalQuestions}` : String(stats.marks) },
    { label: "Score percentage", value: percentage === null ? "—" : `${percentage}%` },
    { label: "Standing", value: `Top ${topPercent}%` },
  ];
  return (
    <section className="overflow-hidden rounded-[28px] border border-[var(--border)] bg-[var(--surface-raised)] shadow-[0_16px_40px_var(--shadow-soft)]">
      <div className="grid sm:grid-cols-[0.8fr_1.2fr]">
        <div className="flex flex-col items-center justify-center bg-[var(--accent-soft)] px-6 py-7 text-center sm:py-9">
          <Trophy size={22} className="mb-3 text-[var(--accent-strong)]" />
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Your rank</p>
          <p className="mt-2 text-6xl font-bold tracking-tight text-[var(--accent-strong)] sm:text-7xl">#{stats.rank}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">of {stats.totalAttendees} candidates</p>
        </div>
        <div className="flex flex-col justify-center gap-3 p-5 sm:p-7">
          {items.map((item) => <div key={item.label} className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--surface-muted)] px-4 py-4"><span className="text-sm text-[var(--text-secondary)]">{item.label}</span><span className="text-lg font-semibold text-[var(--text-primary)]">{item.value}</span></div>)}
        </div>
      </div>
    </section>
  );
}
''', encoding='utf-8')
print('Updated Testing Zone review, rankings, descriptions, and public access.')
