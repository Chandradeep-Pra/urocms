/** All payment arithmetic uses integer pence. No client-supplied price is authoritative. */
export function amountToMinor(value: string | number): number {
  const text = String(value);
  if (!/^\d+(?:\.\d{1,2})?$/.test(text)) throw new Error("INVALID_PAYMENT_AMOUNT");
  const [whole, fraction = ""] = text.split(".");
  const amount = Number(whole) * 100 + Number(fraction.padEnd(2, "0"));
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("INVALID_PAYMENT_AMOUNT");
  return amount;
}
export const minorToAmount = (amount: number) => {
  if (!Number.isSafeInteger(amount) || amount < 0) throw new Error("INVALID_PAYMENT_AMOUNT");
  return `${Math.floor(amount / 100)}.${String(amount % 100).padStart(2, "0")}`;
};
export function addMonthsClamped(start: number, months: number) {
  if (!Number.isFinite(start) || !Number.isInteger(months) || months < 1 || months > 120) throw new Error("INVALID_ACCESS_DURATION");
  const date = new Date(start), day = date.getUTCDate();
  date.setUTCDate(1); date.setUTCMonth(date.getUTCMonth() + months);
  const last = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, last));
  return date.getTime();
}
export function paymentDate(value: unknown): Date | null {
  const parsed = value instanceof Date ? value : value && typeof value === "object" && "toDate" in value
    ? (value as { toDate(): Date }).toDate() : new Date(String(value || ""));
  return Number.isFinite(parsed.getTime()) ? parsed : null;
}
export type PayPalGrant = {
  id: string; userId: string; courseId: string; planId: string; durationMonths: number;
  status: string; verificationVersion: number; environment: string; purchasedAt: unknown; accessBaseEndsAt?: unknown;
};
/** Removing a refunded grant also removes its duration, preserving independent grants. */
export function paypalAccessPeriods(records: PayPalGrant[], uid: string, allowSandbox = false) {
  const ends = new Map<string, number>();
  return records.filter(r => r.userId === uid && r.verificationVersion === 3 && r.status === "COMPLETED"
    && (r.environment === "live" || (allowSandbox && r.environment === "sandbox")))
    .sort((a, b) => (paymentDate(a.purchasedAt)?.getTime() || 0) - (paymentDate(b.purchasedAt)?.getTime() || 0) || a.id.localeCompare(b.id))
    .flatMap(r => {
      const start = paymentDate(r.purchasedAt)?.getTime();
      if (!start || !r.courseId || !r.planId || !Number.isInteger(r.durationMonths) || r.durationMonths < 1 || r.durationMonths > 120) return [];
      const base = Math.max(start, ends.get(r.courseId) || 0, paymentDate(r.accessBaseEndsAt)?.getTime() || 0);
      const end = addMonthsClamped(base, r.durationMonths); ends.set(r.courseId, end);
      return [{ ...r, accessStartsAt: new Date(start).toISOString(), accessEndsAt: new Date(end).toISOString() }];
    });
}
export type PayPalReminder = { enabled: boolean; dates: string[]; timeZone: string; source: "customer"; dismissedDates: string[] };
export function parsePayPalReminder(input: Record<string, unknown>): PayPalReminder {
  if (typeof input.enabled !== "boolean" || !Array.isArray(input.dates) || input.dates.length > 2) throw new Error("INVALID_REMINDER");
  const dates = input.dates.map(date => {
    if (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date) || new Date(`${date}T12:00:00Z`).toISOString().slice(0, 10) !== date) throw new Error("INVALID_REMINDER_DATE");
    return date;
  }).sort();
  if (new Set(dates).size !== dates.length || (input.enabled && !dates.length)) throw new Error("INVALID_REMINDER_DATE");
  if (typeof input.timeZone !== "string" || input.timeZone.length > 80) throw new Error("INVALID_TIMEZONE");
  try { new Intl.DateTimeFormat("en-GB", { timeZone: input.timeZone }).format(); } catch { throw new Error("INVALID_TIMEZONE"); }
  const dismissedDates = Array.isArray(input.dismissedDates) ? input.dismissedDates.filter((d): d is string => typeof d === "string" && dates.includes(d)) : [];
  return { enabled: input.enabled, dates, timeZone: input.timeZone, source: "customer", dismissedDates: [...new Set(dismissedDates)] };
}
export function upcomingPayPalReminders(reminder: PayPalReminder, now = new Date()) {
  if (!reminder.enabled) return [];
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: reminder.timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(now);
  const part = (type: string) => parts.find(p => p.type === type)?.value;
  const today = Date.parse(`${part("year")}-${part("month")}-${part("day")}T12:00:00Z`);
  return reminder.dates.filter(d => !reminder.dismissedDates.includes(d)).flatMap(date => {
    const days = Math.round((Date.parse(`${date}T12:00:00Z`) - today) / 86400000);
    return days >= 0 && days <= 3 ? [{ date, days }] : [];
  });
}
