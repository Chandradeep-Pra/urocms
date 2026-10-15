from pathlib import Path
root=Path(r'C:/Users/chand/Downloads/testing-zone')
def edit(name, old, new, count=1):
    p=root/name; s=p.read_text(encoding='utf-8')
    if old not in s: raise RuntimeError(f'Missing target: {name}: {old[:80]}')
    p.write_text(s.replace(old,new,count),encoding='utf-8')
def write(name, content):
    p=root/name; p.parent.mkdir(parents=True,exist_ok=True);p.write_text(content,encoding='utf-8')

write('components/ui/DescriptionBullets.tsx','''export function descriptionPoints(value: string) {
  return value.split(/\\r?\\n/).map(point => point.replace(/^\\s*(?:[-*•]\\s+|\\d+[.)]\\s+)/, "").trim()).filter(Boolean);
}
export default function DescriptionBullets({ value, className = "" }: { value: string; className?: string }) {
  const points = descriptionPoints(value);
  if (!points.length) return null;
  return <ul className={`mt-2 space-y-1.5 text-sm leading-6 text-[var(--text-secondary)] ${className}`}>{points.map((point, index) => <li key={index} className="flex items-start gap-2"><span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" /><span className="min-w-0 break-words">{point}</span></li>)}</ul>;
}
''')
write('lib/overview-tests.ts','''export type OverviewTest = {
  id: string; hasAttempted?: boolean; accessType?: string; durationMinutes: number;
  startTime?: string | number | { _seconds?: number; seconds?: number };
  endTime?: string | number | { _seconds?: number; seconds?: number };
};
function timestamp(value: OverviewTest["startTime"]): number {
  if (value && typeof value === "object") return Number(value._seconds ?? value.seconds ?? 0) * 1000;
  if (!value) return 0;
  return new Date(value).getTime() || 0;
}
export function latestLiveTests<T extends OverviewTest>(mocks: T[], now = Date.now(), filter = "all"): T[] {
  return mocks.filter(mock => {
    const start = timestamp(mock.startTime);
    const end = timestamp(mock.endTime) || start + mock.durationMinutes * 60000;
    return start > 0 && now >= start && now < end && (filter !== "public" || mock.accessType === "public") && (filter !== "attended" || mock.hasAttempted);
  }).sort((a,b) => Number(Boolean(a.hasAttempted)) - Number(Boolean(b.hasAttempted)) || timestamp(b.startTime) - timestamp(a.startTime)).slice(0,3);
}
''')
edit('components/overview/TestsTabSection.tsx','import { useState } from "react";','import { useEffect, useState } from "react";\nimport { latestLiveTests, type OverviewTest } from "@/lib/overview-tests";\nimport DescriptionBullets from "@/components/ui/DescriptionBullets";')
edit('components/overview/TestsTabSection.tsx','export type MockItem = {','export type MockItem = OverviewTest & {')
edit('components/overview/TestsTabSection.tsx','  const filtered = mocks.filter((mock) => filter === "public" ? mock.accessType === "public" : filter === "attended" ? mock.hasAttempted : true);','  const [now, setNow] = useState(() => Date.now());\n  useEffect(() => { const timer = window.setInterval(() => setNow(Date.now()), 30000); return () => window.clearInterval(timer); }, []);\n  const filtered = latestLiveTests(mocks, now, filter);')
edit('components/overview/TestsTabSection.tsx','"Available mock tests"','"Latest live tests"')
edit('components/overview/TestsTabSection.tsx','{mock.description && <p className="overview-test-description">{mock.description}</p>}','{mock.description && <DescriptionBullets value={mock.description} className="!text-xs" />}')
edit('components/overview/TestsTabSection.tsx','New mock tests will appear here when available.','No tests are live right now. View all tests for upcoming sessions.')
edit('components/overview/LessonHistorySection.tsx','export default function LessonHistorySection({ lessons, loading, isLoggedIn }: Props) {','export default function LessonHistorySection({ lessons, loading, isLoggedIn }: Props) {\n  if (!isLoggedIn || (!loading && lessons.length === 0)) return null;')
edit('app/page.tsx','  }, []);\n\n  // ── Fetch: lesson history', '  }, [user?.uid]);\n\n  // ── Fetch: lesson history')
edit('components/brand/UrologicsBrand.tsx','          Urologics {product}','          {/Urologics/i.test(product) ? product : `Urologics ${product}`}')
edit('app/mocks/page.tsx','import UrologicsHeader from','import DescriptionBullets from "@/components/ui/DescriptionBullets";\nimport UrologicsHeader from')
edit('app/mocks/page.tsx','product="Grand Mocks" tag="Exam session library"','product="Mock Exams" tag="Exam session library"')
edit('app/mocks/page.tsx','''                          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-[var(--text-secondary)]">
                            {mock.description}
                          </p>''','''                          <DescriptionBullets value={mock.description} />''')
edit('app/ai-viva/cases/page.tsx','''isVivaAllowed(viva)
                      ? "bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)]"''','''isVivaAllowed(viva)
                      ? selectedModes[viva.id] === "fast" ? "bg-orange-600 text-white hover:bg-orange-700" : "bg-[var(--accent)] text-[var(--accent-text)] hover:bg-[var(--accent-hover)]"''')

edit('app/courses/page.tsx','  PlayCircle,','  PlayCircle,\n  Search,\n  X,')
edit('app/courses/page.tsx','''              <div className="mt-5 grid gap-4 sm:mt-7 md:grid-cols-2 xl:grid-cols-3">''','''              <div className="relative mt-5 sm:max-w-md"><Search size={18} aria-hidden="true" className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[var(--accent-strong)]" /><input type="search" aria-label="Search courses and lessons" placeholder="Search courses and lessons" value={query} onChange={event => setQuery(event.target.value)} className="urologics-input h-12 pl-11 pr-11" />{query && <button type="button" aria-label="Clear course search" onClick={() => setQuery("")} className="absolute right-0 top-0 grid h-12 w-11 place-items-center text-[var(--text-secondary)]"><X size={16} /></button>}</div>
              <div className="mt-5 grid gap-4 sm:mt-7 md:grid-cols-2 xl:grid-cols-3">''')
edit('app/courses/page.tsx',') : sections.length === 0 ? (',') : filteredSections.length === 0 ? (')
edit('app/courses/page.tsx','No video folders found.','{query ? `No courses or lessons match "${query}".` : "No video folders found."}')
edit('app/courses/page.tsx','                  sections.map((section) => {','                  filteredSections.map((section) => {')
edit('components/courses/CourseSidebar.tsx','placeholder="Search lessons"','aria-label="Search courses and lessons"\n          placeholder="Search courses and lessons"')

write('components/profile/PurchaseHistory.tsx','''"use client";
import { useState } from "react";
import { ReceiptText } from "lucide-react";
export type Purchase = { id: string; courseNameSnapshot?: string; planNameSnapshot?: string; paidAmount?: number; currency?: string; status?: string; paypalOrderId?: string; purchasedAt?: string | null; accessEndsAt?: string | null; createdAt?: string | null };
export function purchaseCategory(status?: string): "succeeded" | "pending" | "cancelled" {
  const normalized = (status || "CREATED").toUpperCase();
  if (["COMPLETED", "SUCCEEDED", "SUCCESS", "PAID", "CAPTURED"].includes(normalized)) return "succeeded";
  if (["CANCELLED", "CANCELED", "VOIDED", "FAILED", "DENIED", "DECLINED", "REFUNDED", "REVERSED"].includes(normalized)) return "cancelled";
  return "pending";
}
export default function PurchaseHistory({ purchases }: { purchases: Purchase[] }) {
  const [tab, setTab] = useState<"succeeded" | "pending" | "cancelled">("succeeded");
  const filtered = purchases.filter(purchase => purchaseCategory(purchase.status) === tab);
  return <section className="urologics-panel p-5 sm:p-6">
    <div className="flex items-center gap-3"><ReceiptText size={20} className="text-[var(--accent-strong)]" /><h2 className="text-xl font-semibold text-[var(--text-primary)]">Purchase history</h2></div>
    <div role="tablist" aria-label="Purchase status" className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-[var(--surface-muted)] p-1">{(["succeeded", "pending", "cancelled"] as const).map(status => <button type="button" role="tab" key={status} id={`purchase-tab-${status}`} aria-controls="purchase-list" aria-selected={tab === status} onClick={() => setTab(status)} className={`rounded-lg px-2 py-2.5 text-xs font-semibold capitalize transition ${tab === status ? "bg-[var(--accent)] text-[var(--accent-text)]" : "text-[var(--text-secondary)] hover:bg-[var(--accent-soft)]"}`}>{status} ({purchases.filter(purchase => purchaseCategory(purchase.status) === status).length})</button>)}</div>
    <div role="tabpanel" id="purchase-list" aria-labelledby={`purchase-tab-${tab}`} tabIndex={0} className="urologics-thin-scrollbar mt-4 h-80 space-y-3 overflow-y-auto pr-1">
      {filtered.length ? filtered.map(purchase => <article key={purchase.id} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold text-[var(--text-primary)]">{purchase.courseNameSnapshot || "Course purchase"}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{purchase.planNameSnapshot || "Plan"}</p></div><span className="rounded-full bg-[var(--accent-soft)] px-3 py-1 text-xs font-semibold text-[var(--accent-strong)]">{purchase.status || "CREATED"}</span></div><div className="mt-3 grid gap-2 break-words text-xs text-[var(--text-secondary)] sm:grid-cols-2"><p>{new Intl.NumberFormat("en-GB", { style: "currency", currency: purchase.currency || "GBP" }).format(Number(purchase.paidAmount || 0))}</p><p>Order: {purchase.paypalOrderId || "Pending"}</p><p>Purchased: {purchase.purchasedAt ? new Date(purchase.purchasedAt).toLocaleDateString("en-GB") : "Pending"}</p><p>Access expires: {purchase.accessEndsAt ? new Date(purchase.accessEndsAt).toLocaleDateString("en-GB") : "Pending"}</p></div></article>) : <p className="py-12 text-center text-sm text-[var(--text-secondary)]">No {tab} payments.</p>}
    </div>
  </section>;
}
''')

edit('app/api/urologics/cloudinary-upload/route.ts','import { getUrologicsApiUrl }','import { getAuthHeader, getUrologicsApiUrl }')
edit('app/api/urologics/cloudinary-upload/route.ts','export async function POST(req: NextRequest) {','export async function POST(req: NextRequest) {\n  const authorization = getAuthHeader(req);\n  if (!authorization) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });')
edit('app/api/urologics/cloudinary-upload/route.ts','getUrologicsApiUrl("/api/cloudinary-upload")','getUrologicsApiUrl("/api/app/profile/image")')
edit('app/api/urologics/cloudinary-upload/route.ts','      method: "POST",','      method: "POST",\n      headers: { Authorization: authorization },')
edit('app/user/page.tsx','  Camera,','  Camera,\n  ChevronDown,')
edit('app/user/page.tsx','  ReceiptText,\n','')
edit('app/user/page.tsx','import GlobalLoading from','import PurchaseHistory, { type Purchase } from "@/components/profile/PurchaseHistory";\nimport GlobalLoading from')
p=root/'app/user/page.tsx';s=p.read_text(encoding='utf-8');a=s.index('type Purchase = {');b=s.index('\n',a);s=s[:a]+s[b:];p.write_text(s,encoding='utf-8')
edit('app/user/page.tsx','    activeCourseIds?: string[];','    activeCourseIds?: string[];\n    activeCourses?: { id: string; title: string }[];')
edit('app/user/page.tsx','  const [medicalInstitutionDraft, setMedicalInstitutionDraft] = useState("");','  const [medicalInstitutionDraft, setMedicalInstitutionDraft] = useState("");\n  const [phoneDraft, setPhoneDraft] = useState("");\n  useEffect(() => () => { if (profileImagePreview.startsWith("blob:")) URL.revokeObjectURL(profileImagePreview); }, [profileImagePreview]);')
edit('app/user/page.tsx','    setMedicalInstitutionDraft(profileMedicalInstitution || "");','    setMedicalInstitutionDraft(profileMedicalInstitution || "");\n    setPhoneDraft(profilePhone);',2)
edit('app/user/page.tsx','      let profileImageUrl = user.profileImageUrl || null;','      let profileImageUrl = access?.profile?.profileImageUrl || user.profileImageUrl || null;')
edit('app/user/page.tsx','          method: "POST",\n          body: formData,','          method: "POST",\n          headers: { Authorization: `Bearer ${user.idToken}` },\n          body: formData,')
edit('app/user/page.tsx','          medicalInstitution: medicalInstitutionDraft.trim(),','          phone: phoneDraft.trim(),\n          medicalInstitution: medicalInstitutionDraft.trim(),')
edit('app/user/page.tsx','                profileImageUrl,\n                medicalInstitution:', '                profileImageUrl,\n                phone: phoneDraft.trim() || null,\n                medicalInstitution:')
edit('app/user/page.tsx','  const profileImagePreviewSrc = profileImagePreview || user?.profileImageUrl || "";','  const profileImagePreviewSrc = profileImagePreview || access?.profile?.profileImageUrl || user?.profileImageUrl || "";')
edit('app/user/page.tsx','    setProfileImageFile(file);','    if (file.size > 5 * 1024 * 1024) { toast.error("Choose an image smaller than 5 MB."); return; }\n    setProfileImageFile(file);')
edit('app/user/page.tsx','                    onClick={editingProfile ? cancelProfileEdit : startProfileEdit}','                    disabled={savingProfile}\n                    onClick={editingProfile ? cancelProfileEdit : startProfileEdit}')
edit('app/user/page.tsx','                          accept="image/*"','                          aria-label="Profile photo"\n                          disabled={savingProfile}\n                          accept="image/jpeg,image/png,image/webp,image/gif"')
edit('app/user/page.tsx','''                    <button
                      type="button"
                      onClick={saveProfile}''','''                    <label className="mt-4 block"><span className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">Phone number</span><input type="tel" aria-label="Phone number" disabled={savingProfile} value={phoneDraft} onChange={event => setPhoneDraft(event.target.value)} placeholder="+44 7700900123" className="urologics-input mt-2" /><span className="mt-1 block text-xs text-[var(--text-tertiary)]">Use a space after the country code, e.g. +44 7700900123.</span></label>
                    <button
                      type="button"
                      onClick={saveProfile}''')
p=root/'app/user/page.tsx';s=p.read_text(encoding='utf-8');a=s.index('              <div className="urologics-panel p-5 sm:p-6">\n                <div className="flex items-center gap-3"><ReceiptText');b=s.index('\n\n              <div className="urologics-panel',a);s=s[:a]+'              <PurchaseHistory purchases={purchases} />'+s[b:];p.write_text(s,encoding='utf-8')
edit('app/user/page.tsx','''                  <InfoRow label="Courses" value={`${access?.profile?.activeCourseIds?.length || 0} active`} />''','''                  <details className="group rounded-2xl bg-[var(--surface-muted)]"><summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-sm [&::-webkit-details-marker]:hidden"><span className="text-[var(--text-secondary)]">Courses</span><span className="ml-auto font-semibold text-[var(--text-primary)]">{access?.profile?.activeCourses?.length || 0} active</span><ChevronDown size={16} className="text-[var(--accent-strong)] transition group-open:rotate-180" /></summary><div className="border-t border-[var(--border)] px-4 py-3">{access?.profile?.activeCourses?.length ? <ul className="space-y-2">{access.profile.activeCourses.map(course => <li key={course.id}><Link href="/courses" className="flex items-center justify-between gap-2 text-sm font-medium text-[var(--accent-strong)]">{course.title}<ArrowRight size={14} /></Link></li>)}</ul> : <p className="text-sm text-[var(--text-secondary)]">No active courses.</p>}</div></details>''')

print('Updated Testing Zone profile, purchases, live tests, descriptions, branding, Viva actions and course search.')
