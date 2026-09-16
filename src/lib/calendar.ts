/**
 * Pure calendar helpers. Dates are calendar dates ("YYYY-MM-DD") with no time
 * zone; converting instants into the viewer's zone happens before these are used.
 */

export const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export type CalendarDay = { date: string; day: number; inMonth: boolean };

const MONTH_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])$/;
const DATE_PATTERN = /^(\d{4})-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return toIso(d);
}

export function isValidDate(value: string | undefined | null): value is string {
  if (!value || !DATE_PATTERN.test(value)) return false;
  return toIso(new Date(`${value}T00:00:00Z`)) === value;
}

/** "YYYY-MM" from a query value, falling back to the month containing `fallbackDate`. */
export function parseMonth(value: string | undefined | null, fallbackDate: string): string {
  const match = value?.match(MONTH_PATTERN);
  if (match && Number(match[1]) >= 1900 && Number(match[1]) <= 2200) return value!;
  return fallbackDate.slice(0, 7);
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return toIso(d).slice(0, 7);
}

/** Six full weeks (Sunday first) covering the month, so the grid height never jumps. */
export function monthGrid(month: string): CalendarDay[] {
  const first = `${month}-01`;
  const startOffset = new Date(`${first}T00:00:00Z`).getUTCDay();
  const start = addDays(first, -startOffset);
  return Array.from({ length: 42 }, (_, i) => {
    const date = addDays(start, i);
    return { date, day: Number(date.slice(8)), inMonth: date.startsWith(month) };
  });
}

/**
 * Dates within [from, to] on which a yearly date recurs (birthdays, anniversaries).
 * Feb 29 falls on Feb 28 in non-leap years. Occurrences before `since` are skipped.
 */
export function yearlyOccurrences(original: string, from: string, to: string, since = original): Array<{ date: string; years: number }> {
  const [originYear, month, day] = original.split("-").map(Number);
  const results: Array<{ date: string; years: number }> = [];
  for (let year = Number(from.slice(0, 4)); year <= Number(to.slice(0, 4)); year++) {
    const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
    const actualDay = month === 2 && day === 29 && !leap ? 28 : day;
    const date = `${year}-${String(month).padStart(2, "0")}-${String(actualDay).padStart(2, "0")}`;
    if (date >= from && date <= to && date >= since) results.push({ date, years: year - originYear });
  }
  return results;
}
