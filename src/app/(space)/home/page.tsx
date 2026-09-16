import { ArrowRight, BookOpen, CalendarDays, Lock, Mail, PenLine, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { MilestoneIcon } from "@/components/content-meta";
import { LinkButton } from "@/components/ui/button";
import { Card, SectionTitle } from "@/components/ui/layout";
import { currentTimeMs, daysSince, formatCalendarDate, formatInstant, todayIn } from "@/lib/dates";
import { signMediaUrls, thumbnailOf } from "@/lib/storage/media";
import { partnerNames, requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";

export const metadata: Metadata = { title: "Home" };

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

export default async function HomePage() {
  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();
  const { supabase, couple } = space;
  const today = todayIn(tz);

  const [journals, events, letters, milestones, photos] = await Promise.all([
    supabase
      .from("journals")
      .select("id, title, entry_date, body, journal_photos(storage_path, thumb_path)")
      .order("entry_date", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(3),
    supabase
      .from("events")
      .select("id, title, starts_at, all_day, location")
      .gte("starts_at", new Date(currentTimeMs() - 12 * 3600_000).toISOString())
      .order("starts_at")
      .limit(3),
    supabase.from("letters").select("id, unlock_at, opened_at, recipient_id"),
    supabase.from("milestones").select("id, title, occurred_on, icon").order("occurred_on", { ascending: false }).limit(3),
    supabase.from("journal_photos").select("storage_path, thumb_path, journal_id").order("created_at", { ascending: false }).limit(6),
  ]);

  const urls = await signMediaUrls(space, [
    couple.cover_path,
    ...(journals.data ?? []).map((j) => (j.journal_photos[0] ? thumbnailOf(j.journal_photos[0]) : null)),
    ...(photos.data ?? []).map(thumbnailOf),
  ]);

  const incoming = (letters.data ?? []).filter((l) => l.recipient_id === space.userId);
  const now = currentTimeMs();
  const sealed = incoming.filter((l) => Date.parse(l.unlock_at) > now);
  const readyToOpen = incoming.filter((l) => Date.parse(l.unlock_at) <= now && !l.opened_at);
  const coverUrl = couple.cover_path ? urls[couple.cover_path] : null;
  const anniversary = couple.story_began_on ? nextAnniversary(couple.story_began_on, today) : null;

  return (
    <div className="os-sections">
      <section className="relative overflow-hidden rounded-[1.75rem]">
        {coverUrl ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
            <img src={coverUrl} alt="" fetchPriority="high" decoding="async" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-black/5" />
          </>
        ) : (
          <div className="absolute inset-0 bg-accent-soft" />
        )}
        <div className={`relative flex min-h-[19rem] flex-col justify-end p-7 sm:min-h-[22rem] sm:p-10 ${coverUrl ? "text-white" : "text-ink"}`}>
          {couple.name ? <p className={`os-eyebrow ${coverUrl ? "!text-white/85" : ""}`}>{couple.name}</p> : null}
          <h1 className="os-display mt-3 text-5xl leading-[1.02] font-medium sm:text-7xl">{partnerNames(space)}</h1>
          <p className={`os-display mt-2 text-2xl italic sm:text-3xl ${coverUrl ? "text-white/90" : "text-accent"}`}>{couple.display_title}</p>
          {couple.description ? (
            <p className={`mt-4 max-w-xl text-lg leading-relaxed ${coverUrl ? "text-white/85" : "text-muted"}`}>{couple.description}</p>
          ) : null}
          {couple.story_began_on ? (
            <p className={`mt-5 text-sm ${coverUrl ? "text-white/80" : "text-muted"}`}>
              Together since {formatCalendarDate(couple.story_began_on)}
              {daysSince(couple.story_began_on, tz) >= 0 ? ` · ${daysSince(couple.story_began_on, tz).toLocaleString()} days` : null}
            </p>
          ) : null}
        </div>
      </section>

      {space.pendingInvitation && !space.partner ? (
        <Card className="flex flex-wrap items-center justify-between gap-4 p-5 sm:p-6">
          <div>
            <p className="os-display text-xl text-ink">Waiting for your partner</p>
            <p className="mt-1 text-sm text-muted">
              Invitation sent to {space.pendingInvitation.invited_email}. It expires {formatInstant(space.pendingInvitation.expires_at, tz, { dateStyle: "long" })}.
            </p>
          </div>
          <LinkButton href="/settings#invitation" variant="secondary" size="sm">
            Manage invitation
          </LinkButton>
        </Card>
      ) : null}

      <section className="flex flex-wrap gap-2">
        <LinkButton href="/story/new" size="sm">
          <PenLine className="size-4" aria-hidden /> Write an entry
        </LinkButton>
        <LinkButton href="/calendar" size="sm" variant="secondary">
          <CalendarDays className="size-4" aria-hidden /> Plan something
        </LinkButton>
        {space.partner ? (
          <LinkButton href="/letters/new" size="sm" variant="secondary">
            <Mail className="size-4" aria-hidden /> Write a letter
          </LinkButton>
        ) : null}
      </section>

      <div className="grid gap-[var(--os-gap)] md:grid-cols-3">
        <Card className="p-6">
          <p className="os-eyebrow">Next up</p>
          {events.data?.length ? (
            <ul className="mt-4 space-y-4">
              {events.data.map((e) => (
                <li key={e.id}>
                  <p className="os-display text-lg leading-snug text-ink">{e.title}</p>
                  <p className="text-sm text-muted">
                    {formatInstant(e.starts_at, tz, e.all_day ? { weekday: "short", month: "short", day: "numeric" } : { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    {e.location ? ` · ${e.location}` : ""}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted">Nothing planned yet. Dinner this week?</p>
          )}
          <Link href="/calendar" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            Calendar <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Card>

        <Card className="p-6">
          <p className="os-eyebrow">Letters</p>
          {readyToOpen.length ? (
            <p className="os-display mt-4 text-2xl leading-snug text-ink">
              {readyToOpen.length === 1 ? "A letter is ready for you to open." : `${readyToOpen.length} letters are ready to open.`}
            </p>
          ) : sealed.length ? (
            <div className="mt-4">
              <p className="os-display flex items-center gap-2 text-2xl leading-snug text-ink">
                <Lock className="size-5 text-accent" aria-hidden /> A letter is waiting for you.
              </p>
              <p className="mt-1 text-sm text-muted">
                Opens {formatInstant(sealed.map((l) => l.unlock_at).sort()[0], tz, { dateStyle: "long" })}.
              </p>
            </div>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted">No letters waiting. Maybe write one that opens on a day that matters.</p>
          )}
          <Link href="/letters" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            Letters <ArrowRight className="size-3.5" aria-hidden />
          </Link>
        </Card>

        <Card className="p-6">
          <p className="os-eyebrow">Milestones</p>
          {anniversary ? (
            <p className="mt-4 text-sm text-muted">
              {anniversary.years === 0 ? "First" : `Year ${anniversary.years}`} anniversary on {formatCalendarDate(anniversary.date, { month: "long", day: "numeric" })}
            </p>
          ) : null}
          {milestones.data?.length ? (
            <ul className="mt-4 space-y-3">
              {milestones.data.map((m) => (
                <li key={m.id} className="flex items-start gap-3">
                  <span className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-accent">
                    <MilestoneIcon icon={m.icon} className="size-3.5" />
                  </span>
                  <span>
                    <span className="block leading-snug text-ink">{m.title}</span>
                    <span className="text-xs text-muted">{formatCalendarDate(m.occurred_on, { dateStyle: "medium" })}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm leading-relaxed text-muted">Mark the firsts: first date, first trip, first home.</p>
          )}
          <Link href="/milestones" className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline">
            <Sparkles className="size-3.5" aria-hidden /> Milestones
          </Link>
        </Card>
      </div>

      <section>
        <SectionTitle
          action={
            <Link href="/story" className="text-sm font-medium text-accent hover:underline">
              All entries
            </Link>
          }
        >
          Latest from your story
        </SectionTitle>
        {journals.data?.length ? (
          <div className="grid gap-[var(--os-gap)] sm:grid-cols-3">
            {journals.data.map((j) => {
              const photo = j.journal_photos[0] ? thumbnailOf(j.journal_photos[0]) : null;
              return (
                <Link key={j.id} href={`/story/${j.id}`} className="os-card group overflow-hidden transition hover:-translate-y-0.5">
                  {photo && urls[photo] ? (
                    // eslint-disable-next-line @next/next/no-img-element -- signed private URL
                    <img src={urls[photo]} alt="" loading="lazy" decoding="async" className="aspect-[4/3] w-full bg-accent-soft object-cover" />
                  ) : (
                    <div className="grid aspect-[4/3] place-items-center bg-accent-soft text-accent">
                      <BookOpen className="size-6" aria-hidden />
                    </div>
                  )}
                  <div className="p-5">
                    <p className="text-xs text-muted">{formatCalendarDate(j.entry_date)}</p>
                    <p className="os-display mt-1 text-xl leading-snug text-ink group-hover:text-accent">{j.title}</p>
                    {j.body ? <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted">{j.body}</p> : null}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <Card className="p-8 text-center">
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
              <Link href="/memories" className="text-sm font-medium text-accent hover:underline">
                All memories
              </Link>
            }
          >
            Recent memories
          </SectionTitle>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {photos.data.map((p) =>
              urls[thumbnailOf(p)] ? (
                <Link key={p.storage_path} href={`/story/${p.journal_id}`} className="overflow-hidden rounded-xl">
                  {/* eslint-disable-next-line @next/next/no-img-element -- signed private URL */}
                  <img src={urls[thumbnailOf(p)]} alt="" loading="lazy" decoding="async" className="aspect-square w-full bg-accent-soft object-cover transition hover:scale-105" />
                </Link>
              ) : null,
            )}
          </div>
        </section>
      ) : null}
    </div>
  );
}
