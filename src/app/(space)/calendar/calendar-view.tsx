"use client";

import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Images, Pencil, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteEvent } from "@/app/actions/content";
import { MilestoneIcon } from "@/components/content-meta";
import { ConfirmSubmit } from "@/components/ui/form";
import { WEEKDAY_LABELS, type CalendarDay } from "@/lib/calendar";
import { formatCalendarDate } from "@/lib/dates";
import { ACTIVITY_KINDS, type ActivityKind } from "@/lib/theme";
import { EventForm } from "./event-form";

export type DayActivities = {
  plans: { id: string; title: string; timeLabel: string; location: string | null; description: string | null }[];
  stories: { id: string; title: string; mood: string | null; excerpt: string | null; authorName: string | null; photoCount: number }[];
  milestones: { id: string | null; title: string; description: string | null; icon: string; kind: "milestone" | "anniversary" | "birthday" }[];
  photos: { id: string; journalId: string; journalTitle: string; caption: string | null; url: string }[];
};

type EditableEvent = {
  id: string;
  title: string;
  description: string | null;
  all_day: boolean;
  location: string | null;
  place_id: string | null;
  date: string;
  startTime: string;
  endTime: string;
};

const KIND_META: Record<ActivityKind, { label: string; singular: string; icon: LucideIcon }> = {
  plans: { label: "Plans", singular: "plan", icon: CalendarDays },
  stories: { label: "Stories", singular: "story", icon: BookOpen },
  milestones: { label: "Milestones", singular: "milestone", icon: Sparkles },
  photos: { label: "Photos", singular: "photo", icon: Images },
};

const EMPTY: DayActivities = { plans: [], stories: [], milestones: [], photos: [] };

function Dot({ kind, className = "size-2" }: { kind: ActivityKind; className?: string }) {
  return <span aria-hidden className={`inline-block shrink-0 rounded-full ${className}`} style={{ backgroundColor: `var(--os-activity-${kind})` }} />;
}

function describeDay(date: string, activities: DayActivities): string {
  const parts = ACTIVITY_KINDS.filter((k) => activities[k].length).map((k) => {
    const n = activities[k].length;
    return `${n} ${n === 1 ? KIND_META[k].singular : KIND_META[k].label.toLowerCase()}`;
  });
  const label = formatCalendarDate(date, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  return parts.length ? `${label}: ${parts.join(", ")}` : `${label}: nothing yet`;
}

export function CalendarView({
  month,
  monthLabel,
  previousMonth,
  nextMonth,
  today,
  grid,
  days,
  initialDate,
  places,
  editing,
}: {
  month: string;
  monthLabel: string;
  previousMonth: string;
  nextMonth: string;
  today: string;
  grid: CalendarDay[];
  days: Record<string, DayActivities>;
  initialDate: string | null;
  places: { id: string; name: string }[];
  editing: EditableEvent | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(initialDate);
  const panelRef = useRef<HTMLDivElement>(null);

  const monthTotals = ACTIVITY_KINDS.map((kind) => ({
    kind,
    count: grid.filter((d) => d.inMonth).reduce((sum, d) => sum + (days[d.date]?.[kind].length ?? 0), 0),
  }));

  function selectDay(cell: CalendarDay) {
    if (!cell.inMonth) {
      router.push(`/calendar?month=${cell.date.slice(0, 7)}&date=${cell.date}`, { scroll: false });
      return;
    }
    setSelected(cell.date);
    const url = new URL(window.location.href);
    url.searchParams.set("month", month);
    url.searchParams.set("date", cell.date);
    url.searchParams.delete("edit");
    window.history.replaceState(null, "", url);
    if (window.matchMedia("(max-width: 1023px)").matches) {
      panelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }

  const activities = (selected && days[selected]) || EMPTY;
  const hasAnything = ACTIVITY_KINDS.some((k) => activities[k].length);
  const editingThisDay = editing && (!selected || editing.date === selected) ? editing : null;
  const navLink = "grid size-9 place-items-center rounded-full text-muted transition hover:bg-accent-soft hover:text-ink";

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
      <section className="os-card p-3 sm:p-5" aria-label={`Calendar for ${monthLabel}`}>
        <div className="flex items-center justify-between gap-2 px-1 pb-4">
          <h2 className="os-display text-2xl text-ink sm:text-3xl">{monthLabel}</h2>
          <div className="flex items-center gap-1">
            {!today.startsWith(month) ? (
              <Link href={`/calendar?month=${today.slice(0, 7)}&date=${today}`} scroll={false} className="mr-1 rounded-full border border-line px-3 py-1.5 text-sm text-ink hover:border-accent/60">
                Today
              </Link>
            ) : null}
            <Link href={`/calendar?month=${previousMonth}`} scroll={false} className={navLink} aria-label="Previous month">
              <ChevronLeft className="size-5" aria-hidden />
            </Link>
            <Link href={`/calendar?month=${nextMonth}`} scroll={false} className={navLink} aria-label="Next month">
              <ChevronRight className="size-5" aria-hidden />
            </Link>
          </div>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 pb-4 text-sm text-muted" aria-label="Legend">
          {monthTotals.map(({ kind, count }) => (
            <li key={kind} className="inline-flex items-center gap-1.5">
              <Dot kind={kind} />
              <span className="text-ink">{KIND_META[kind].label}</span>
              <span className="tabular-nums">{count}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium tracking-wide text-muted uppercase" aria-hidden>
          {WEEKDAY_LABELS.map((w) => (
            <span key={w} className="pb-2">
              <span className="sm:hidden">{w.slice(0, 1)}</span>
              <span className="hidden sm:inline">{w}</span>
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1" role="group" aria-label={monthLabel}>
          {grid.map((cell) => {
            const cellActivities = days[cell.date] ?? EMPTY;
            const isSelected = cell.date === selected;
            const isToday = cell.date === today;
            return (
              <button
                key={cell.date}
                type="button"
                onClick={() => selectDay(cell)}
                aria-pressed={isSelected}
                aria-label={describeDay(cell.date, cellActivities)}
                title={describeDay(cell.date, cellActivities)}
                className={`flex min-h-14 flex-col items-center rounded-xl px-0.5 pt-1 pb-2 transition sm:min-h-20 sm:items-start sm:px-2 sm:pt-1.5 ${
                  isSelected ? "bg-accent-soft ring-2 ring-accent" : "hover:bg-accent-soft/60"
                } ${cell.inMonth ? "text-ink" : "text-muted opacity-45"}`}
              >
                <span
                  className={`grid size-7 place-items-center rounded-full text-sm tabular-nums ${isToday ? "bg-accent font-semibold text-on-accent" : ""}`}
                >
                  {cell.day}
                </span>
                {/* Fixed slot per kind, so position identifies the kind as well as color. */}
                <span className="mt-auto flex gap-px sm:gap-1" aria-hidden>
                  {ACTIVITY_KINDS.map((kind) => (
                    <span
                      key={kind}
                      className="size-2 rounded-full"
                      style={{ backgroundColor: cellActivities[kind].length ? `var(--os-activity-${kind})` : "transparent" }}
                    />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      <div ref={panelRef} className="scroll-mt-20 space-y-6 lg:sticky lg:top-20">
        <section className="os-card p-5 sm:p-6" aria-live="polite">
          {selected ? (
            <>
              <p className="os-eyebrow">{formatCalendarDate(selected, { weekday: "long" })}</p>
              <h2 className="os-display mt-1 text-3xl text-ink">{formatCalendarDate(selected, { month: "long", day: "numeric", year: "numeric" })}</h2>
              {!hasAnything ? <p className="mt-3 text-sm text-muted">Nothing on this day yet.</p> : null}
              <div className="mt-5 space-y-6">
                <DaySection kind="plans" count={activities.plans.length}>
                  {activities.plans.map((plan) => (
                    <li key={plan.id} className="group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-medium text-ink">{plan.title}</p>
                          <p className="text-sm text-muted">
                            {plan.timeLabel}
                            {plan.location ? ` · ${plan.location}` : ""}
                          </p>
                          {plan.description ? <p className="mt-1 line-clamp-3 text-sm whitespace-pre-wrap text-muted">{plan.description}</p> : null}
                        </div>
                        <div className="flex shrink-0">
                          <Link
                            href={`/calendar?month=${month}&date=${selected}&edit=${plan.id}`}
                            scroll={false}
                            className="rounded-full p-1.5 text-muted hover:bg-accent-soft hover:text-ink"
                          >
                            <Pencil className="size-3.5" aria-label={`Edit ${plan.title}`} />
                          </Link>
                          <form action={deleteEvent}>
                            <input type="hidden" name="eventId" value={plan.id} />
                            <ConfirmSubmit message="Delete this plan?" className="rounded-full p-1.5 text-muted hover:bg-danger/10 hover:text-danger">
                              <Trash2 className="size-3.5" aria-label={`Delete ${plan.title}`} />
                            </ConfirmSubmit>
                          </form>
                        </div>
                      </div>
                    </li>
                  ))}
                </DaySection>

                <DaySection kind="stories" count={activities.stories.length}>
                  {activities.stories.map((story) => (
                    <li key={story.id}>
                      <Link href={`/story/${story.id}`} className="group block">
                        <p className="font-medium text-ink group-hover:text-accent">{story.title}</p>
                        <p className="text-sm text-muted">
                          {[story.authorName && `By ${story.authorName}`, story.mood, story.photoCount ? `${story.photoCount} ${story.photoCount === 1 ? "photo" : "photos"}` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                        {story.excerpt ? <p className="mt-1 line-clamp-2 text-sm text-muted">{story.excerpt}</p> : null}
                      </Link>
                    </li>
                  ))}
                </DaySection>

                <DaySection kind="milestones" count={activities.milestones.length}>
                  {activities.milestones.map((m, i) => {
                    const body = (
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                          <MilestoneIcon icon={m.icon} className="size-3.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block font-medium text-ink">{m.title}</span>
                          {m.description ? <span className="line-clamp-2 block text-sm text-muted">{m.description}</span> : null}
                        </span>
                      </div>
                    );
                    return (
                      <li key={m.id ?? `${m.kind}-${i}`}>
                        {m.id ? (
                          <Link href="/milestones" className="block hover:opacity-80">
                            {body}
                          </Link>
                        ) : (
                          body
                        )}
                      </li>
                    );
                  })}
                </DaySection>

                <DaySection kind="photos" count={activities.photos.length} list={false}>
                  <div className="grid grid-cols-3 gap-2">
                    {activities.photos.map((photo) => (
                      <Link key={photo.id} href={`/story/${photo.journalId}`} className="overflow-hidden rounded-lg" title={photo.caption ?? photo.journalTitle}>
                        {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                        <img src={photo.url} alt={photo.caption ?? ""} loading="lazy" decoding="async" className="aspect-square w-full bg-accent-soft object-cover transition hover:scale-105" />
                      </Link>
                    ))}
                  </div>
                </DaySection>
              </div>

              <div className="mt-6 flex flex-wrap gap-2 border-t border-line pt-5">
                <Link href={`/story/new?date=${selected}`} className="inline-flex h-9 items-center gap-1.5 rounded-full border border-line px-3.5 text-sm text-ink hover:border-accent/60">
                  <BookOpen className="size-3.5" aria-hidden /> Write about this day
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="os-display text-2xl text-ink">Pick a day</h2>
              <p className="mt-2 text-sm text-muted">Days with a colored dot have something in them. Choose one to see everything from that day.</p>
            </>
          )}
        </section>

        <EventForm
          key={editingThisDay ? `edit-${editingThisDay.id}` : `new-${selected ?? month}`}
          event={editingThisDay ?? undefined}
          places={places}
          defaultDate={selected ?? `${month}-01`}
          heading={
            editingThisDay ? "Edit plan" : selected ? `Add a plan for ${formatCalendarDate(selected, { month: "short", day: "numeric" })}` : "Add a plan"
          }
          cancelHref={`/calendar?month=${month}${selected ? `&date=${selected}` : ""}`}
        />
      </div>
    </div>
  );
}

function DaySection({ kind, count, children, list = true }: { kind: ActivityKind; count: number; children: React.ReactNode; list?: boolean }) {
  if (count === 0) return null;
  const { label, icon: Icon } = KIND_META[kind];
  return (
    <div>
      <h3 className="mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
        <Dot kind={kind} />
        <Icon className="size-3.5" aria-hidden />
        {label}
        <span className="tabular-nums">{count}</span>
      </h3>
      {list ? <ul className="space-y-3">{children}</ul> : children}
    </div>
  );
}
