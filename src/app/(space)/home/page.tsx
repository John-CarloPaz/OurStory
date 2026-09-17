import { ArrowRight, BookOpen, CalendarDays, Lock, Mail, MailOpen, PenLine, Send, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import { Fragment, type CSSProperties, type ReactNode } from "react";
import Link from "next/link";
import { MilestoneIcon } from "@/components/content-meta";
import { Doodle, Tape } from "@/components/decor/materials";
import { ScrapbookPage } from "@/components/scrapbook/scrapbook-page";
import { LinkButton } from "@/components/ui/button";
import { Card, Reveal, SectionTitle } from "@/components/ui/layout";
import { currentTimeMs, daysSince, formatCalendarDate, formatInstant, todayIn } from "@/lib/dates";
import { scrapbookForJournal } from "@/lib/scrapbook/server";
import { signMediaUrls, thumbnailOf } from "@/lib/storage/media";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { CoverCollage, CoverPolaroid, TicketStub } from "./cover-art";

export const metadata: Metadata = { title: "Home" };

const PAGE_TILTS = [-1.8, 1.4, -0.8];
const PHOTO_TILTS = [-4, 3, -2, 4, -3, 2];
const TAPE_COLORS = ["#f6b8c2", "#b5d8f0", "#ffcf99", "#c6e5c3", "#d5c4ef"];

function nextAnniversary(began: string, today: string): { date: string; years: number } {
  const [y, m, d] = began.split("-").map(Number);
  const [ty] = today.split("-").map(Number);
  let year = ty;
  let candidate = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  if (candidate <= today) {
    year += 1;
    candidate = `${year}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
  }
  return { date: candidate, years: year - y };
}

function WidgetHeading({ icon, children }: { icon: ReactNode; children: ReactNode }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="grid size-10 shrink-0 -rotate-6 place-items-center rounded-2xl bg-accent-soft text-accent shadow-sm">
        {icon}
      </span>
      <p className="os-eyebrow">{children}</p>
    </div>
  );
}

const widgetLink = "mt-auto inline-flex min-h-10 items-center gap-1 self-start pt-5 text-sm font-medium text-accent hover:underline";

export default async function HomePage() {
  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();
  const { supabase, couple } = space;
  const today = todayIn(tz);

  const [journals, events, letters, milestones, photos] = await Promise.all([
    supabase
      .from("journals")
      .select("id, title, entry_date, mood, body, scrapbook, scrapbook_updated_at, journal_photos(id, storage_path, thumb_path, width, height)")
      .eq("couple_id", space.coupleId)
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("events")
      .select("id, title, starts_at, all_day, location")
      .eq("couple_id", space.coupleId)
      .gte("starts_at", new Date(currentTimeMs() - 12 * 3600_000).toISOString())
      .order("starts_at")
      .limit(3),
    supabase.from("letters").select("id, unlock_at, opened_at, recipient_id").eq("couple_id", space.coupleId),
    supabase.from("milestones").select("id, title, occurred_on, icon").eq("couple_id", space.coupleId).order("occurred_on", { ascending: false }).limit(3),
    supabase.from("journal_photos").select("storage_path, thumb_path, journal_id").eq("couple_id", space.coupleId).order("created_at", { ascending: false }).limit(6),
  ]);

  const entries = journals.data ?? [];
  // Mini scrapbook pages only need thumbnails.
  const urls = await signMediaUrls(space, [
    couple.cover_path,
    ...entries.flatMap((j) => j.journal_photos.map(thumbnailOf)),
    ...(photos.data ?? []).map(thumbnailOf),
  ]);

  const incoming = (letters.data ?? []).filter((l) => l.recipient_id === space.userId);
  const now = currentTimeMs();
  const sealed = incoming.filter((l) => Date.parse(l.unlock_at) > now);
  const readyToOpen = incoming.filter((l) => Date.parse(l.unlock_at) <= now && !l.opened_at);
  const coverUrl = couple.cover_path ? urls[couple.cover_path] : null;
  const anniversary = couple.story_began_on ? nextAnniversary(couple.story_began_on, today) : null;
  const togetherDays = couple.story_began_on ? daysSince(couple.story_began_on, tz) : null;

  return (
    <div className="os-sections">
      {/* The cover of their scrapbook */}
      <section className="relative isolate">
        <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
          <Doodle kind="sparkle" className="os-float absolute top-1 right-3 size-8 text-accent/45 [--tilt:-8deg] lg:right-[46%]" />
          <Doodle kind="heart" className="os-float absolute top-[46%] right-[44%] hidden size-10 text-accent/25 [--tilt:12deg] [animation-delay:-2.5s] lg:block" />
          <Doodle kind="star" className="os-float absolute bottom-0 left-[58%] size-7 text-accent/30 [animation-delay:-4s] lg:left-[40%]" />
        </div>

        <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-12">
          <div className="min-w-0">
            {couple.name ? (
              <p className="os-eyebrow flex items-center gap-1.5">
                <Doodle kind="sparkle" className="size-3.5" />
                {couple.name}
              </p>
            ) : null}
            <h1 className="os-display mt-3 text-[2.75rem] leading-[1.02] font-medium text-ink [overflow-wrap:anywhere] sm:text-7xl lg:text-[5.25rem]">
              {space.members.map((member, index) => (
                <Fragment key={member.userId}>
                  {index > 0 ? <span className="os-hand mx-2 inline-block -rotate-6 align-[0.05em] text-[0.8em] text-accent sm:mx-3"> ♡ </span> : null}
                  <span>{member.displayName}</span>
                </Fragment>
              ))}
            </h1>
            <p className="relative mt-3 inline-block -rotate-2 pb-2">
              <span className="os-hand text-[2rem] leading-tight text-accent sm:text-[2.6rem]">{couple.display_title}</span>
              <svg aria-hidden viewBox="0 0 48 48" preserveAspectRatio="none" className="pointer-events-none absolute -bottom-1 left-0 h-4 w-[min(100%,12rem)] text-accent/50">
                <path d="M4 30c12-5 28-6 40-2" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              </svg>
            </p>
            {couple.description ? <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">{couple.description}</p> : null}
            {couple.story_began_on ? (
              <div className="mt-7">
                <TicketStub since={formatCalendarDate(couple.story_began_on)} days={togetherDays !== null && togetherDays >= 0 ? togetherDays : null} />
              </div>
            ) : null}
          </div>

          {coverUrl ? (
            <CoverPolaroid src={coverUrl} caption={couple.story_began_on ? `est. ${couple.story_began_on.slice(0, 4)}` : undefined} />
          ) : (
            <CoverCollage />
          )}
        </div>
      </section>

      {space.pendingInvitation && !space.partner ? (
        <Card className="relative flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <Tape className="absolute -top-3 left-8 w-20" rotate={-5} color="#ffcf99" pattern="checks" />
          <div className="flex min-w-0 items-start gap-4">
            <span aria-hidden className="grid size-11 shrink-0 rotate-6 place-items-center rounded-2xl bg-accent-soft text-accent">
              <Send className="size-5" />
            </span>
            <div className="min-w-0">
              <p className="os-display text-xl text-ink">Waiting for your partner</p>
              <p className="mt-1 text-sm text-muted [overflow-wrap:anywhere]">
                Invitation sent to {space.pendingInvitation.invited_email}. It expires {formatInstant(space.pendingInvitation.expires_at, tz, { dateStyle: "long" })}.
              </p>
            </div>
          </div>
          <LinkButton href="/settings#invitation" variant="secondary">
            Manage invitation
          </LinkButton>
        </Card>
      ) : null}

      <section className="flex flex-wrap items-center gap-2.5">
        <LinkButton href="/story/new">
          <PenLine className="size-4" aria-hidden /> Write an entry
        </LinkButton>
        <LinkButton href="/calendar" variant="secondary">
          <CalendarDays className="size-4" aria-hidden /> Plan something
        </LinkButton>
        {space.partner ? (
          <LinkButton href="/letters/new" variant="secondary">
            <Mail className="size-4" aria-hidden /> Write a letter
          </LinkButton>
        ) : null}
      </section>

      <div className="grid gap-[var(--os-gap)] md:grid-cols-3">
        <Reveal index={0}>
          <Card className="flex h-full flex-col p-6">
            <WidgetHeading icon={<CalendarDays className="size-[1.1rem]" />}>Next up</WidgetHeading>
            {events.data?.length ? (
              <ul className="mt-5 space-y-4">
                {events.data.map((e) => (
                  <li key={e.id} className="flex items-start gap-3">
                    <span aria-hidden className="flex w-11 shrink-0 flex-col overflow-hidden rounded-xl border border-line bg-field text-center leading-none shadow-sm">
                      <span className="bg-accent py-1 text-[0.6rem] font-semibold tracking-wider text-on-accent uppercase">
                        {formatInstant(e.starts_at, tz, { month: "short" })}
                      </span>
                      <span className="os-display py-1.5 text-lg text-ink">{formatInstant(e.starts_at, tz, { day: "numeric" })}</span>
                    </span>
                    <div className="min-w-0">
                      <p className="os-display text-lg leading-snug text-ink [overflow-wrap:anywhere]">{e.title}</p>
                      <p className="text-sm text-muted">
                        {formatInstant(e.starts_at, tz, e.all_day ? { weekday: "short", month: "short", day: "numeric" } : { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                        {e.location ? ` · ${e.location}` : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="os-hand mt-5 text-2xl leading-snug text-muted">Nothing planned yet. Dinner this week?</p>
            )}
            <Link href="/calendar" className={widgetLink}>
              Calendar <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Card>
        </Reveal>

        <Reveal index={1}>
          <Card className="relative flex h-full flex-col p-6">
            <Tape className="absolute -top-3 left-1/2 w-24 -translate-x-1/2" rotate={3} color={TAPE_COLORS[0]} pattern="stripes" />
            <WidgetHeading icon={readyToOpen.length ? <MailOpen className="size-[1.1rem]" /> : <Mail className="size-[1.1rem]" />}>Letters</WidgetHeading>
            {readyToOpen.length ? (
              <p className="os-display mt-5 text-2xl leading-snug text-ink">
                {readyToOpen.length === 1 ? "A letter is ready for you to open." : `${readyToOpen.length} letters are ready to open.`}
              </p>
            ) : sealed.length ? (
              <div className="mt-5">
                <p className="os-display flex items-center gap-2 text-2xl leading-snug text-ink">
                  <Lock className="size-5 shrink-0 text-accent" aria-hidden /> A letter is waiting for you.
                </p>
                <p className="mt-1 text-sm text-muted">
                  Opens {formatInstant(sealed.map((l) => l.unlock_at).sort()[0], tz, { dateStyle: "long" })}.
                </p>
              </div>
            ) : (
              <p className="os-hand mt-5 text-2xl leading-snug text-muted">No letters waiting. Maybe write one that opens on a day that matters.</p>
            )}
            <Link href="/letters" className={widgetLink}>
              Letters <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          </Card>
        </Reveal>

        <Reveal index={2}>
          <Card className="relative flex h-full flex-col p-6">
            <Doodle kind="star" className="pointer-events-none absolute top-5 right-5 size-7 text-accent/35" />
            <WidgetHeading icon={<Sparkles className="size-[1.1rem]" />}>Milestones</WidgetHeading>
            {anniversary ? (
              <p
                className="os-stamp mt-5 self-start border-accent/70 text-[0.7rem] leading-snug text-ink mix-blend-normal"
                style={{ "--tilt": "-2deg" } as CSSProperties}
              >
                {anniversary.years === 0 ? "First" : `Year ${anniversary.years}`} anniversary on {formatCalendarDate(anniversary.date, { month: "long", day: "numeric" })}
              </p>
            ) : null}
            {milestones.data?.length ? (
              <ul className="mt-5 space-y-3">
                {milestones.data.map((m) => (
                  <li key={m.id} className="flex items-start gap-3">
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-full bg-accent text-on-accent shadow-sm">
                      <MilestoneIcon icon={m.icon} className="size-3.5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block leading-snug text-ink [overflow-wrap:anywhere]">{m.title}</span>
                      <span className="text-xs text-muted">{formatCalendarDate(m.occurred_on, { dateStyle: "medium" })}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="os-hand mt-5 text-2xl leading-snug text-muted">Mark the firsts: first date, first trip, first home.</p>
            )}
            <Link href="/milestones" className={widgetLink}>
              <Sparkles className="size-3.5" aria-hidden /> Milestones
            </Link>
          </Card>
        </Reveal>
      </div>

      <section>
        <SectionTitle
          action={
            <Link href="/story" className="inline-flex min-h-10 shrink-0 items-center text-sm font-medium text-accent hover:underline">
              All entries
            </Link>
          }
        >
          Latest from your story
        </SectionTitle>
        {entries.length ? (
          <Reveal>
            {/* Phones: a swipeable row of pages. Larger screens: a three-page spread. */}
            <ul className="-mx-4 flex snap-x snap-mandatory scroll-px-4 gap-5 overflow-x-auto px-4 pt-4 pb-8 [scrollbar-width:none] sm:mx-0 sm:grid sm:grid-cols-3 sm:items-start sm:gap-7 sm:overflow-visible sm:px-0 sm:pb-2">
              {entries.map((j, index) => {
                const { scrapbook } = scrapbookForJournal(
                  j,
                  j.journal_photos.map((p) => ({ id: p.id, width: p.width, height: p.height })),
                );
                const sources = Object.fromEntries(j.journal_photos.map((p) => [p.id, { thumb: urls[thumbnailOf(p)] ?? null, full: null }]));
                return (
                  <li key={j.id} className="w-[74%] shrink-0 snap-center sm:w-auto">
                    <Link
                      href={`/story/${j.id}`}
                      className="group block transition-[rotate,translate] duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] [rotate:var(--tilt)] hover:-translate-y-1.5 hover:[rotate:0deg] focus-visible:[rotate:0deg]"
                      style={{ "--tilt": `${PAGE_TILTS[index % PAGE_TILTS.length]}deg` } as CSSProperties}
                    >
                      <div className="pointer-events-none">
                        <ScrapbookPage scrapbook={scrapbook} photos={sources}>
                          <span aria-hidden className="absolute inset-0 z-[1000] rounded-[1.2cqw] ring-0 ring-accent/50 transition ring-inset group-hover:ring-4" />
                        </ScrapbookPage>
                      </div>
                      <div className="mt-4 px-1">
                        <p className="os-eyebrow">
                          {formatCalendarDate(j.entry_date, { weekday: "short", month: "short", day: "numeric" })}
                          {j.mood ? ` · ${j.mood}` : ""}
                        </p>
                        <p className="os-display mt-1 line-clamp-2 text-xl leading-snug text-ink transition group-hover:text-accent sm:text-2xl">{j.title}</p>
                        {j.scrapbook_updated_at ? <p className="os-hand text-lg leading-none text-accent">decorated ✿</p> : null}
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </Reveal>
        ) : (
          <Card className="relative overflow-hidden p-8 text-center sm:p-10">
            <Doodle kind="heart" className="os-float pointer-events-none absolute top-5 right-6 size-9 text-accent/25" />
            <span aria-hidden className="mx-auto mb-4 grid size-12 -rotate-6 place-items-center rounded-2xl bg-accent-soft text-accent">
              <BookOpen className="size-5" />
            </span>
            <p className="os-display text-2xl text-ink">Your story starts here.</p>
            <p className="mt-2 text-muted">Write about a day you never want to forget.</p>
            <LinkButton href="/story/new" className="mt-6">
              Write the first entry
            </LinkButton>
          </Card>
        )}
      </section>

      {photos.data?.length ? (
        <section>
          <SectionTitle
            action={
              <Link href="/memories" className="inline-flex min-h-10 shrink-0 items-center text-sm font-medium text-accent hover:underline">
                All memories
              </Link>
            }
          >
            Recent memories
          </SectionTitle>
          <Reveal>
            <ul className="grid grid-cols-3 gap-x-3 gap-y-6 pt-3 sm:grid-cols-6 sm:gap-x-4">
              {photos.data.map((p, index) =>
                urls[thumbnailOf(p)] ? (
                  <li key={p.storage_path} className="relative">
                    {index % 2 === 0 ? (
                      <Tape className="absolute -top-2 left-1/2 z-10 h-4 w-12 -translate-x-1/2" rotate={index % 4 === 0 ? -6 : 5} color={TAPE_COLORS[index % TAPE_COLORS.length]} />
                    ) : null}
                    <Link href={`/story/${p.journal_id}`} aria-label="Open the story this photo belongs to" className="group block rounded-[3px]">
                      <figure
                        className="os-polaroid p-1.5 pb-5 [--tilt:var(--t)] group-focus-visible:[--tilt:0deg] sm:p-2 sm:pb-7"
                        style={{ "--t": `${PHOTO_TILTS[index % PHOTO_TILTS.length]}deg` } as CSSProperties}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                        <img src={urls[thumbnailOf(p)]} alt="" loading="lazy" decoding="async" className="aspect-square w-full rounded-[2px] bg-[#efe7da] object-cover" />
                      </figure>
                    </Link>
                  </li>
                ) : null,
              )}
            </ul>
          </Reveal>
        </section>
      ) : null}
    </div>
  );
}
