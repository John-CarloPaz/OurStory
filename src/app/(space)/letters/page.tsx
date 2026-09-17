import { Lock, Mail, PenLine } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties, ReactNode } from "react";
import Link from "next/link";
import { LinkButton } from "@/components/ui/button";
import { EmptyState, PageHeader, Reveal, SectionTitle } from "@/components/ui/layout";
import { currentTimeMs, formatInstant } from "@/lib/dates";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { AIRMAIL_BORDER, Envelope, MiniEnvelope, Postmark, STAMP_INK } from "./stationery";

export const metadata: Metadata = { title: "Letters" };

const TILTS = [-1.4, 1.1, -0.7, 1.6];

const tiltStyle = (index: number) => ({ "--tilt": `${TILTS[index % TILTS.length]}deg` }) as CSSProperties;

function StatusStamp({ color, children }: { color: string; children: ReactNode }) {
  return (
    <span className="os-stamp shrink-0 text-[0.64rem]" style={{ color, "--tilt": "-7deg" } as CSSProperties}>
      <span className="inline-flex items-center gap-1">{children}</span>
    </span>
  );
}

export default async function LettersPage() {
  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();

  // Envelopes only. Content lives in letter_contents and is never needed here.
  const { data } = await space.supabase
    .from("letters")
    .select("id, title, unlock_at, opened_at, author_id, recipient_id, created_at")
    .eq("couple_id", space.coupleId)
    .order("unlock_at", { ascending: true });

  const letters = data ?? [];
  const now = currentTimeMs();
  const incoming = letters.filter((l) => l.recipient_id === space.userId);
  const waiting = incoming.filter((l) => Date.parse(l.unlock_at) > now);
  const ready = incoming.filter((l) => Date.parse(l.unlock_at) <= now).reverse();
  const written = letters.filter((l) => l.author_id === space.userId).reverse();
  const nameOf = (id: string) => space.members.find((m) => m.userId === id)?.displayName ?? "Your partner";
  const initialOf = (id: string) => {
    const name = space.members.find((m) => m.userId === id)?.displayName.trim();
    return name ? Array.from(name)[0].toUpperCase() : undefined;
  };

  return (
    <div className="os-sections">
      <PageHeader
        eyebrow="Letters"
        title="Words that wait for the right day"
        note="sealed with love"
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
          <ul className="grid gap-x-6 gap-y-10 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {waiting.map((l, index) => (
              <Reveal key={l.id} as="li" index={index % 6}>
                <div
                  className="group relative rotate-[var(--tilt)] transition duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] hover:-translate-y-1.5 hover:rotate-0"
                  style={tiltStyle(index)}
                >
                  <Envelope state="sealed" initial={initialOf(l.author_id)}>
                    <p className="sr-only">A letter is waiting for you.</p>
                    <p className="os-hand text-[1.65rem] leading-[1.1] break-words">“{l.title}”</p>
                    <p className="os-hand text-xl leading-tight opacity-75">from {nameOf(l.author_id)}</p>
                    <Postmark
                      className="mt-3"
                      label={
                        <>
                          <Lock className="size-3" aria-hidden /> Opens
                        </>
                      }
                    >
                      {formatInstant(l.unlock_at, tz, { dateStyle: "long", timeStyle: "short" })}
                    </Postmark>
                  </Envelope>
                </div>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      {ready.length ? (
        <section>
          <SectionTitle>Ready to read</SectionTitle>
          <ul className="grid gap-x-6 gap-y-10 pt-3 sm:grid-cols-2 lg:grid-cols-3">
            {ready.map((l, index) => (
              <Reveal key={l.id} as="li" index={index % 6}>
                <Link
                  href={`/letters/${l.id}`}
                  className="group relative block rotate-[var(--tilt)] rounded-md transition duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] hover:-translate-y-1.5 hover:rotate-0 focus-visible:rotate-0"
                  style={tiltStyle(index + 1)}
                >
                  {!l.opened_at ? (
                    <span className="os-pop absolute -top-2.5 -left-1.5 z-20 rotate-[-8deg] rounded-full bg-accent px-3 py-1 text-xs font-semibold text-on-accent shadow-md">
                      Unopened
                    </span>
                  ) : null}
                  <Envelope state={l.opened_at ? "opened" : "unopened"} initial={initialOf(l.author_id)}>
                    <p className="os-hand text-[1.65rem] leading-[1.1] break-words decoration-1 underline-offset-4 group-hover:underline">{l.title}</p>
                    <p className="os-hand text-xl leading-tight opacity-75">from {nameOf(l.author_id)}</p>
                    <p className="mt-2 font-typewriter text-[0.7rem] tracking-[0.14em] uppercase opacity-65">
                      {formatInstant(l.unlock_at, tz, { dateStyle: "medium" })}
                    </p>
                  </Envelope>
                </Link>
              </Reveal>
            ))}
          </ul>
        </section>
      ) : null}

      {written.length ? (
        <section>
          <SectionTitle>Letters you&apos;ve written</SectionTitle>
          <ul className="grid gap-4 pt-1 lg:grid-cols-2">
            {written.map((l, index) => {
              const sealed = Date.parse(l.unlock_at) > now;
              return (
                <Reveal key={l.id} as="li" index={index % 6}>
                  <Link
                    href={`/letters/${l.id}`}
                    className="group block rounded-2xl p-[5px] shadow-[0_14px_30px_-20px_rgb(40_25_10/0.55)] transition duration-300 hover:-translate-y-0.5"
                    style={{ backgroundImage: AIRMAIL_BORDER }}
                  >
                    <span className="flex items-center gap-3 rounded-[0.8rem] bg-[#fdf8ee] p-3 text-[#3b2f2a] sm:gap-4 sm:px-4">
                      <MiniEnvelope state={sealed ? "sealed" : l.opened_at ? "read" : "delivered"} />
                      <span className="min-w-0 flex-1">
                        <span className="os-display block truncate text-lg leading-snug decoration-1 underline-offset-4 group-hover:underline">{l.title}</span>
                        <span className="block text-sm text-[#6f6058]">
                          To {nameOf(l.recipient_id)} · {sealed ? "opens" : "opened"} {formatInstant(l.unlock_at, tz, { dateStyle: "medium" })}
                        </span>
                      </span>
                      {sealed ? (
                        <StatusStamp color={STAMP_INK}>
                          <Lock className="size-3" aria-hidden /> Sealed
                        </StatusStamp>
                      ) : l.opened_at ? (
                        <StatusStamp color="#3f7a57">Read</StatusStamp>
                      ) : (
                        <StatusStamp color="#3d6db5">Delivered</StatusStamp>
                      )}
                    </span>
                  </Link>
                </Reveal>
              );
            })}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
