/**
 * Time zone aware helpers. The viewer's IANA time zone is stored in a cookie by
 * <TimeZoneSync/>, so server-rendered dates and user-entered times are
 * interpreted in the viewer's zone rather than the server's.
 */

export const TIME_ZONE_COOKIE = "os_tz";

/**
 * The current time, for Server Components. They render once per request, so
 * reading the clock is intentional there (e.g. "is this letter still sealed?").
 * Authorization never depends on it: the database compares against its own now().
 */
export function currentTimeMs(): number {
  return Date.now();
}

export function isValidTimeZone(tz: string | undefined | null): tz is string {
  if (!tz || tz.length > 64) return false;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

function zoneOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(utcMs / 1000) * 1000;
}

/** Wall-clock date + time in `timeZone` -> UTC instant. */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = zoneOffsetMs(guess, timeZone);
  let utc = guess - first;
  const second = zoneOffsetMs(utc, timeZone);
  if (second !== first) utc = guess - second;
  return new Date(utc);
}

/** UTC instant -> { date: YYYY-MM-DD, time: HH:MM } in `timeZone` (for form defaults). */
export function utcToZonedParts(instant: string | Date, timeZone: string): { date: string; time: string } {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(new Date(instant));
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function todayIn(timeZone: string): string {
  return utcToZonedParts(new Date(), timeZone).date;
}

/** Formats a calendar date (YYYY-MM-DD, no time zone) without shifting it. */
export function formatCalendarDate(date: string, options: Intl.DateTimeFormatOptions = { dateStyle: "long" }): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(new Date(`${date}T00:00:00Z`));
}

export function formatInstant(
  instant: string | Date,
  timeZone: string,
  options: Intl.DateTimeFormatOptions = { dateStyle: "long", timeStyle: "short" },
): string {
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone }).format(new Date(instant));
}

/** Whole days from a calendar date to today (in the viewer's zone). */
export function daysSince(date: string, timeZone: string): number {
  const from = Date.parse(`${date}T00:00:00Z`);
  const to = Date.parse(`${todayIn(timeZone)}T00:00:00Z`);
  return Math.floor((to - from) / 86_400_000);
}
