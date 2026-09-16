import { Lock, Mail, MailOpen, PenLine } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { Badge, EmptyState, PageHeader, SectionTitle } from "@/components/ui/layout";
import { currentTimeMs, formatInstant } from "@/lib/dates";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";

export const metadata: Metadata = { title: "Letters" };

export default async function LettersPage() {
  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();

  // Envelopes only. Content lives in letter_contents and is never needed here.
  const { data } = await space.supabase
    .from("letters")
    .select("id, title, unlock_at, opened_at, author_id, recipient_id, created_at")
    .order("unlock_at", { ascending: true });

  const letters = data ?? [];
  const now = currentTimeMs();
  const incoming = letters.filter((l) => l.recipient_id === space.userId);
  const waiting = incoming.filter((l) => Date.parse(l.unlock_at) > now);
  const ready = incoming.filter((l) => Date.parse(l.unlock_at) <= now).reverse();
  const written = letters.filter((l) => l.author_id === space.userId).reverse();
  const nameOf = (id: string) => space.members.find((m) => m.userId === id)?.displayName ?? "Your partner";

  return (
    <div className="os-sections">
      <PageHeader
        eyebrow="Letters"
        title="Words that wait for the right day"
        description="Write a letter and choose when it opens. Until then, it stays sealed, even from the person it's for."
        actions={
          space.partner ? (
            <LinkButton href="/letters/new">
              <PenLine className="size-4" aria-hidden /> Write a letter
            </LinkButton>
          ) : null
        }
      />

      {!space.partner ? (
        <EmptyState icon={<Mail className="size-5" />} title="Letters open once your partner joins">
          As soon as they accept your invitation, you can start writing to each other.
        </EmptyState>
      ) : letters.length === 0 ? (
        <EmptyState icon={<Mail className="size-5" />} title="No letters yet" action={<LinkButton href="/letters/new">Write the first one</LinkButton>}>
          Write something for an anniversary, a hard day, or a Tuesday a year from now.
        </EmptyState>
      ) : null}

      {waiting.length ? (
        <section>
          <SectionTitle>Waiting for you</SectionTitle>
          <ul className="grid gap-[var(--os-gap)] sm:grid-cols-2">
            {waiting.map((l) => (
              <li key={l.id} className="os-card relative overflow-hidden p-6">
                <div className="pointer-events-none absolute -top-10 -right-10 size-32 rotate-12 rounded-3xl bg-accent-soft" aria-hidden />
                <Lock className="relative size-5 text-accent" aria-hidden />
                <p className="os-display relative mt-4 text-2xl leading-snug text-ink">A letter is waiting for you.</p>
                <p className="relative mt-1 text-sm text-muted">
                  From {nameOf(l.author_id)} · “{l.title}”
                </p>
                <p className="relative mt-4 text-sm font-medium text-accent">Opens {formatInstant(l.unlock_at, tz, { dateStyle: "long", timeStyle: "short" })}.</p>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {ready.length ? (
        <section>
          <SectionTitle>Ready to read</SectionTitle>
          <ul className="grid gap-[var(--os-gap)] sm:grid-cols-2">
            {ready.map((l) => (
              <li key={l.id}>
                <Link href={`/letters/${l.id}`} className="os-card group block p-6 transition hover:-translate-y-0.5">
                  {l.opened_at ? <MailOpen className="size-5 text-muted" aria-hidden /> : <Mail className="size-5 text-accent" aria-hidden />}
                  <p className="os-display mt-4 text-2xl leading-snug text-ink group-hover:text-accent">{l.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    From {nameOf(l.author_id)} · {formatInstant(l.unlock_at, tz, { dateStyle: "medium" })}
                  </p>
                  {!l.opened_at ? (
                    <span className="mt-4 inline-block">
                      <Badge tone="accent">Unopened</Badge>
                    </span>
                  ) : null}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {written.length ? (
        <section>
          <SectionTitle>Letters you&apos;ve written</SectionTitle>
          <ul className="space-y-3">
            {written.map((l) => {
              const sealed = Date.parse(l.unlock_at) > now;
              return (
                <li key={l.id}>
                  <Link href={`/letters/${l.id}`} className="os-card flex items-center justify-between gap-4 p-5 transition hover:-translate-y-0.5">
                    <div className="min-w-0">
                      <p className="os-display truncate text-xl text-ink">{l.title}</p>
                      <p className="text-sm text-muted">
                        To {nameOf(l.recipient_id)} · {sealed ? "opens" : "opened"} {formatInstant(l.unlock_at, tz, { dateStyle: "medium" })}
                      </p>
                    </div>
                    {sealed ? (
                      <Badge>
                        <Lock className="size-3" aria-hidden /> Sealed
                      </Badge>
                    ) : l.opened_at ? (
                      <Badge tone="accent">Read</Badge>
                    ) : (
                      <Badge>Delivered</Badge>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
