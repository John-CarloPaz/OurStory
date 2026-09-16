import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/layout";
import { addDays, isValidDate, monthGrid, parseMonth, shiftMonth, yearlyOccurrences } from "@/lib/calendar";
import { formatCalendarDate, formatInstant, todayIn, utcToZonedParts, zonedTimeToUtc } from "@/lib/dates";
import { signMediaUrls, thumbnailOf } from "@/lib/storage/media";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { uuid } from "@/lib/validation";
import { CalendarView, type DayActivities } from "./calendar-view";

export const metadata: Metadata = { title: "Calendar" };

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; date?: string; edit?: string }>;
}) {
  const params = await searchParams;
  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();
  const { supabase } = space;

  const today = todayIn(tz);
  const month = parseMonth(params.month ?? params.date?.slice(0, 7), today);
  const grid = monthGrid(month);
  const gridStart = grid[0].date;
  const gridEnd = grid[grid.length - 1].date;

  const editId = uuid.safeParse(params.edit).success ? params.edit! : null;

  // Everything below is read as the viewer, so RLS limits it to this couple.
  const [eventsRes, journalsRes, milestonesRes, placesRes, editRes] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, description, starts_at, ends_at, all_day, location, place_id, places(name)")
      .gte("starts_at", zonedTimeToUtc(gridStart, "00:00", tz).toISOString())
      .lt("starts_at", zonedTimeToUtc(addDays(gridEnd, 1), "00:00", tz).toISOString())
      .order("starts_at"),
    supabase
      .from("journals")
      .select("id, title, mood, body, entry_date, created_by, journal_photos(id, storage_path, thumb_path, caption, created_at)")
      .gte("entry_date", gridStart)
      .lte("entry_date", gridEnd)
      .order("created_at"),
    supabase
      .from("milestones")
      .select("id, title, description, occurred_on, icon")
      .gte("occurred_on", gridStart)
      .lte("occurred_on", gridEnd)
      .order("created_at"),
    supabase.from("places").select("id, name").order("name"),
    editId
      ? supabase.from("events").select("id, title, description, starts_at, ends_at, all_day, location, place_id").eq("id", editId).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const journals = journalsRes.data ?? [];
  const allPhotos = journals.flatMap((j) => j.journal_photos.map((p) => ({ ...p, journal: j })));
  const urls = await signMediaUrls(space, allPhotos.map(thumbnailOf));
  const nameOf = (userId: string | null) => space.members.find((m) => m.userId === userId)?.displayName ?? null;

  const days: Record<string, DayActivities> = {};
  const day = (date: string) => (days[date] ??= { plans: [], stories: [], milestones: [], photos: [] });
  const time = (instant: string) => formatInstant(instant, tz, { hour: "numeric", minute: "2-digit" });

  for (const e of eventsRes.data ?? []) {
    day(utcToZonedParts(e.starts_at, tz).date).plans.push({
      id: e.id,
      title: e.title,
      timeLabel: e.all_day ? "All day" : `${time(e.starts_at)}${e.ends_at ? ` – ${time(e.ends_at)}` : ""}`,
      location: [e.places?.name, e.location].filter(Boolean).join(" · ") || null,
      description: e.description,
    });
  }

  for (const j of journals) {
    day(j.entry_date).stories.push({
      id: j.id,
      title: j.title,
      mood: j.mood,
      excerpt: j.body ? j.body.slice(0, 220) : null,
      authorName: nameOf(j.created_by),
      photoCount: j.journal_photos.length,
    });
  }

  for (const p of [...allPhotos].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const url = urls[thumbnailOf(p)];
    if (!url) continue;
    day(p.journal.entry_date).photos.push({ id: p.id, journalId: p.journal.id, journalTitle: p.journal.title, caption: p.caption, url });
  }

  for (const m of milestonesRes.data ?? []) {
    day(m.occurred_on).milestones.push({ id: m.id, title: m.title, description: m.description, icon: m.icon, kind: "milestone" });
  }

  // Recurring special days come from the couple's own data.
  if (space.couple.story_began_on) {
    for (const { date, years } of yearlyOccurrences(space.couple.story_began_on, gridStart, gridEnd)) {
      day(date).milestones.push({
        id: null,
        title: years === 0 ? "Your story began" : `${years} ${years === 1 ? "year" : "years"} together`,
        description: years === 0 ? null : `Since ${formatCalendarDate(space.couple.story_began_on)}`,
        icon: "heart",
        kind: "anniversary",
      });
    }
  }
  for (const member of space.members) {
    if (!member.birthday) continue;
    for (const { date } of yearlyOccurrences(member.birthday, gridStart, gridEnd)) {
      day(date).milestones.push({
        id: null,
        title: member.isMe ? "Your birthday" : `${member.displayName}'s birthday`,
        description: null,
        icon: "gift",
        kind: "birthday",
      });
    }
  }

  const initialDate = isValidDate(params.date) ? params.date : today.startsWith(month) ? today : null;

  const editRow = editRes.data;
  const editing = editRow
    ? {
        ...editRow,
        date: utcToZonedParts(editRow.starts_at, tz).date,
        startTime: editRow.all_day ? "" : utcToZonedParts(editRow.starts_at, tz).time,
        endTime: editRow.ends_at ? utcToZonedParts(editRow.ends_at, tz).time : "",
      }
    : null;

  return (
    <div className="os-sections">
      <PageHeader
        eyebrow="Calendar"
        title="Your days together"
        description="Plans, stories, milestones and photos, day by day. Pick a date to see everything that happened."
      />
      <CalendarView
        key={month}
        month={month}
        monthLabel={formatCalendarDate(`${month}-01`, { month: "long", year: "numeric" })}
        previousMonth={shiftMonth(month, -1)}
        nextMonth={shiftMonth(month, 1)}
        today={today}
        grid={grid}
        days={days}
        initialDate={initialDate}
        places={placesRes.data ?? []}
        editing={editing}
      />
    </div>
  );
}
