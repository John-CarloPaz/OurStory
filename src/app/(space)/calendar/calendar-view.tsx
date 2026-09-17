"use client";

import { BookOpen, CalendarDays, ChevronLeft, ChevronRight, Images, Pencil, Sparkles, Trash2, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, type CSSProperties } from "react";
import { deleteEvent } from "@/app/actions/content";
import { MilestoneIcon } from "@/components/content-meta";
import { Doodle, StickyNote, Tape } from "@/components/decor/materials";
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

/** Washi tape holding each day-panel section. Decorative, and deliberately not the activity colors. */
const SECTION_TAPE: Record<ActivityKind, { color: string; rotate: number }> = {
  plans: { color: "#ffcf99", rotate: -5 },
  stories: { color: "#d5c4ef", rotate: 4 },
  milestones: { color: "#f6b8c2", rotate: -3 },
  photos: { color: "#c6e5c3", rotate: 5 },
};

const PHOTO_TILTS = [-3, 2.5, -1.5, 3, -2.5, 1.5];

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
  const monthTotal = monthTotals.reduce((sum, { count }) => sum + count, 0);

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
  const navLink = "os-glass grid size-10 place-items-center rounded-full text-muted transition hover:-translate-y-0.5 hover:border-accent/50 hover:text-ink";

  return (
    <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <section className="os-card relative p-3 sm:p-6" aria-label={`Calendar for ${monthLabel}`}>
        <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2 px-1 pb-4">
          <div className="min-w-0">
            <h2 className="os-display text-[1.85rem] leading-tight text-ink sm:text-4xl">{monthLabel}</h2>
            <p aria-hidden className="os-hand -mt-0.5 inline-block -rotate-2 text-xl text-accent sm:text-2xl">
              {monthTotal === 0 ? "a blank page, for now" : `${monthTotal} little ${monthTotal === 1 ? "moment" : "moments"} ✿`}
            </p>
          </div>
          <div className="flex items-center gap-1.5 pt-1">
            {!today.startsWith(month) ? (
              <Link
                href={`/calendar?month=${today.slice(0, 7)}&date=${today}`}
                scroll={false}
                className="os-glass mr-0.5 inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-accent/50"
              >
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

        <ul className="flex flex-wrap gap-1.5 px-1 pb-5 text-sm text-muted sm:gap-2" aria-label="Legend">
          {monthTotals.map(({ kind, count }) => (
            <li key={kind} className="os-glass inline-flex items-center gap-1.5 rounded-full py-1 pr-3 pl-2.5">
              <Dot kind={kind} />
              <span className="text-ink">{KIND_META[kind].label}</span>
              <span className="tabular-nums">{count}</span>
            </li>
          ))}
        </ul>

        <div className="grid grid-cols-7 gap-1 text-center text-xs font-medium tracking-wide text-muted uppercase sm:gap-1.5" aria-hidden>
          {WEEKDAY_LABELS.map((w) => (
            <span key={w} className="pb-2">
              <span className="sm:hidden">{w.slice(0, 1)}</span>
              <span className="hidden sm:inline">{w}</span>
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-1.5" role="group" aria-label={monthLabel}>
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
                className={`relative flex min-h-14 flex-col items-center rounded-xl border px-0.5 pt-1 pb-2 transition duration-200 sm:min-h-20 sm:items-start sm:rounded-2xl sm:px-2 sm:pt-1.5 ${
                  isSelected
                    ? "border-transparent bg-accent-soft shadow-[0_10px_24px_-14px_color-mix(in_srgb,var(--os-primary)_70%,transparent)] ring-2 ring-accent"
                    : cell.inMonth
                      ? "border-[var(--os-glass-border)] bg-[color-mix(in_srgb,var(--os-field)_45%,transparent)] hover:-translate-y-px hover:border-accent/40 hover:bg-accent-soft/70"
                      : "border-transparent hover:bg-accent-soft/40"
                } ${cell.inMonth ? "text-ink" : "text-muted opacity-45"}`}
              >
                <span
                  className={`grid size-7 place-items-center rounded-full text-sm tabular-nums ${
                    isToday ? "bg-accent font-semibold text-on-accent shadow-[0_6px_14px_-6px_color-mix(in_srgb,var(--os-primary)_80%,transparent)]" : ""
                  }`}
                >
                  {cell.day}
                </span>
                {isToday ? (
                  <span aria-hidden className="os-hand pointer-events-none absolute top-1 right-1.5 hidden -rotate-6 text-base leading-none text-accent lg:block">
                    today
                  </span>
                ) : null}
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

      <div ref={panelRef} className="scroll-mt-20 space-y-8 lg:sticky lg:top-20">
        <section className="os-card relative p-5 sm:p-6" aria-live="polite">
          {selected ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="os-eyebrow">{formatCalendarDate(selected, { weekday: "long" })}</p>
                  <h2 className="os-display mt-1 text-3xl leading-tight text-ink">{formatCalendarDate(selected, { month: "long", day: "numeric", year: "numeric" })}</h2>
                </div>
                <span
                  aria-hidden
                  className="grid w-14 shrink-0 overflow-hidden rounded-xl border border-line bg-field text-center leading-none shadow-sm"
                  style={{ rotate: "4deg" } as CSSProperties}
                >
                  <span className="bg-accent py-1 text-[0.6rem] font-semibold tracking-wider text-on-accent uppercase">
                    {formatCalendarDate(selected, { month: "short" })}
                  </span>
                  <span className="os-display py-2 text-2xl text-ink">{formatCalendarDate(selected, { day: "numeric" })}</span>
                </span>
              </div>

              {!hasAnything ? (
                <StickyNote tilt={-1.5} className="mt-5 px-4 pt-3.5 pb-4">
                  <p className="os-hand text-2xl leading-snug">Nothing on this day yet.</p>
                </StickyNote>
              ) : null}

              <div className="mt-6 space-y-7">
                <DaySection kind="plans" count={activities.plans.length}>
                  {activities.plans.map((plan) => (
                    <li key={plan.id} className="group">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 pt-1.5">
                          <p className="font-medium text-ink [overflow-wrap:anywhere]">{plan.title}</p>
                          <p className="text-sm text-muted">
                            {plan.timeLabel}
                            {plan.location ? ` · ${plan.location}` : ""}
                          </p>
                          {plan.description ? <p className="mt-1 line-clamp-3 text-sm whitespace-pre-wrap text-muted">{plan.description}</p> : null}
                        </div>
                        <div className="-mr-1.5 flex shrink-0">
                          <Link
                            href={`/calendar?month=${month}&date=${selected}&edit=${plan.id}`}
                            scroll={false}
                            className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-accent-soft hover:text-ink"
                          >
                            <Pencil className="size-3.5" aria-label={`Edit ${plan.title}`} />
                          </Link>
                          <form action={deleteEvent}>
                            <input type="hidden" name="eventId" value={plan.id} />
                            <ConfirmSubmit
                              message="Delete this plan?"
                              className="grid size-10 place-items-center rounded-full text-muted transition hover:bg-danger/10 hover:text-danger"
                            >
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
                      <Link href={`/story/${story.id}`} className="group -mx-2 block rounded-xl px-2 py-1.5 transition hover:bg-accent-soft/60">
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
                        <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent text-on-accent shadow-sm">
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
                          <Link href="/milestones" className="-mx-2 block rounded-xl px-2 py-1.5 transition hover:bg-accent-soft/60">
                            {body}
                          </Link>
                        ) : (
                          <div className="py-1.5">{body}</div>
                        )}
                      </li>
                    );
                  })}
                </DaySection>

                <DaySection kind="photos" count={activities.photos.length} list={false}>
                  <div className="grid grid-cols-3 gap-x-3 gap-y-4 pt-1">
                    {activities.photos.map((photo, index) => (
                      <Link key={photo.id} href={`/story/${photo.journalId}`} className="group block rounded-[3px]" title={photo.caption ?? photo.journalTitle}>
                        <figure
                          className="os-polaroid p-1 pb-4 [--tilt:var(--t)] group-focus-visible:[--tilt:0deg]"
                          style={{ "--t": `${PHOTO_TILTS[index % PHOTO_TILTS.length]}deg` } as CSSProperties}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                          <img src={photo.url} alt={photo.caption ?? ""} loading="lazy" decoding="async" className="aspect-square w-full rounded-[2px] bg-[#efe7da] object-cover" />
                        </figure>
                      </Link>
                    ))}
                  </div>
                </DaySection>
              </div>

              <div className="mt-7 flex flex-wrap gap-2 border-t border-dashed border-line pt-5">
                <Link
                  href={`/story/new?date=${selected}`}
                  className="os-glass inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-accent/50"
                >
                  <BookOpen className="size-3.5" aria-hidden /> Write about this day
                </Link>
              </div>
            </>
          ) : (
            <>
              <h2 className="os-display text-2xl text-ink">Pick a day</h2>
              <StickyNote tilt={-1.5} color="#fff1a8" className="relative mt-4 px-4 pt-3.5 pb-4">
                <Doodle kind="star" className="pointer-events-none absolute -top-3 -right-2 size-7 rotate-12 text-[#d08a3a]" />
                <p className="os-hand text-[1.35rem] leading-snug">Days with a colored dot have something in them. Choose one to see everything from that day.</p>
              </StickyNote>
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
  const tape = SECTION_TAPE[kind];
  return (
    <div className="relative rounded-2xl border border-line bg-[color-mix(in_srgb,var(--os-field)_70%,transparent)] px-4 pt-5 pb-4 shadow-[0_12px_24px_-20px_rgb(0_0_0/0.45)]">
      <Tape className="absolute -top-2.5 left-5 z-10 h-5 w-16" rotate={tape.rotate} color={tape.color} pattern="stripes" />
      {/* Faint ruled lines give each section a notebook-paper feel, drawn from theme tokens. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-2xl opacity-70"
        style={{ backgroundImage: "repeating-linear-gradient(transparent 0 1.6rem, color-mix(in srgb, var(--os-primary) 10%, transparent) 1.6rem 1.66rem)" }}
      />
      <h3 className="relative mb-2.5 flex items-center gap-2 text-xs font-semibold tracking-wide text-muted uppercase">
        <Dot kind={kind} />
        <Icon className="size-3.5" aria-hidden />
        {label}
        <span className="tabular-nums">{count}</span>
      </h3>
      {list ? <ul className="relative space-y-3">{children}</ul> : <div className="relative">{children}</div>}
    </div>
  );
}
