import { Pencil, Sparkles, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { deleteMilestone } from "@/app/actions/content";
import { MilestoneIcon } from "@/components/content-meta";
import { Doodle } from "@/components/decor/materials";
import { ConfirmSubmit } from "@/components/ui/form";
import { EmptyState, PageHeader, Reveal } from "@/components/ui/layout";
import { formatCalendarDate, todayIn } from "@/lib/dates";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { uuid } from "@/lib/validation";
import { MilestoneForm } from "./milestone-form";

export const metadata: Metadata = { title: "Milestones" };

/** A hand-drawn wavy line, tiled down the timeline. Painted with the accent color through a mask. */
const SQUIGGLE_MASK =
  "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='16' height='44' viewBox='0 0 16 44'><path d='M8 0c5 6 5 11 0 22s-5 16 0 22' fill='none' stroke='black' stroke-width='2.2' stroke-linecap='round'/></svg>\") center top / 16px 44px repeat-y";

const STAMP_TILTS = [-4, 3, -2, 4];

export default async function MilestonesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const space = await requireActiveSpace();
  const { data } = await space.supabase
    .from("milestones")
    .select("id, title, description, occurred_on, icon")
    .eq("couple_id", space.coupleId)
    .order("occurred_on", { ascending: false });
  const milestones = data ?? [];
  const editing = uuid.safeParse(edit).success ? milestones.find((m) => m.id === edit) : undefined;

  return (
    <div className="os-sections">
      <PageHeader
        eyebrow="Milestones"
        title="The moments that changed everything"
        note="the big ones"
        description="First dates, first homes, the yes, the big trip."
      />

      <div className="grid items-start gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="min-w-0">
          {milestones.length === 0 ? (
            <EmptyState icon={<Sparkles className="size-5" />} title="No milestones yet">
              Start with the day your story began.
            </EmptyState>
          ) : (
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute top-6 bottom-16 left-3 w-4 bg-accent/45 sm:left-4"
                style={{ WebkitMask: SQUIGGLE_MASK, mask: SQUIGGLE_MASK }}
              />
              <ol className="relative space-y-7 sm:space-y-9">
                {milestones.map((m, index) => {
                  const year = m.occurred_on.slice(0, 4);
                  const newYear = index === 0 || milestones[index - 1].occurred_on.slice(0, 4) !== year;
                  const isEditing = editing?.id === m.id;
                  return (
                    <li key={m.id} className="relative">
                      {newYear ? (
                        <p className="os-hand relative mb-3 ml-14 text-3xl leading-none text-accent sm:ml-[4.5rem] sm:text-4xl">
                          <span className="inline-block -rotate-3">{year}</span>
                        </p>
                      ) : null}
                      <Reveal index={index % 4} className="flex gap-4 sm:gap-6">
                        {/* Medallion */}
                        <span aria-hidden className="relative z-10 mt-3 grid size-10 shrink-0 place-items-center sm:size-12">
                          <span className="absolute inset-0 rounded-full border-2 border-dashed border-accent/50 bg-[var(--os-bg)]" />
                          <span className="relative grid size-8 place-items-center rounded-full bg-[linear-gradient(135deg,var(--os-primary),color-mix(in_srgb,var(--os-primary)_68%,#ff9f7a))] text-on-accent shadow-[0_8px_18px_-8px_color-mix(in_srgb,var(--os-primary)_80%,transparent)] sm:size-10">
                            <MilestoneIcon icon={m.icon} className="size-4 sm:size-[1.15rem]" />
                          </span>
                        </span>

                        <div className={`os-card relative min-w-0 flex-1 p-5 sm:p-6 ${isEditing ? "ring-2 ring-accent" : ""}`}>
                          <p
                            className="os-stamp border-accent/70 text-[0.7rem] text-ink mix-blend-normal sm:text-xs"
                            style={{ "--tilt": `${STAMP_TILTS[index % STAMP_TILTS.length]}deg` } as CSSProperties}
                          >
                            {formatCalendarDate(m.occurred_on)}
                          </p>
                          <h2 className="os-display mt-3 text-2xl leading-snug text-ink [overflow-wrap:anywhere] sm:text-[1.75rem]">{m.title}</h2>
                          {m.description ? <p className="mt-2 leading-relaxed whitespace-pre-wrap text-muted [overflow-wrap:anywhere]">{m.description}</p> : null}
                          <div className="mt-4 -mb-1 flex flex-wrap gap-1 border-t border-line pt-3">
                            <Link
                              href={`/milestones?edit=${m.id}`}
                              className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm text-muted transition hover:bg-accent-soft hover:text-ink"
                            >
                              <Pencil className="size-3.5" aria-hidden /> Edit
                            </Link>
                            <form action={deleteMilestone}>
                              <input type="hidden" name="milestoneId" value={m.id} />
                              <ConfirmSubmit
                                message="Delete this milestone?"
                                className="inline-flex h-10 items-center gap-1.5 rounded-full px-3.5 text-sm text-muted transition hover:bg-danger/10 hover:text-danger"
                              >
                                <Trash2 className="size-3.5" aria-hidden /> Delete
                              </ConfirmSubmit>
                            </form>
                          </div>
                        </div>
                      </Reveal>
                    </li>
                  );
                })}
              </ol>
              <p aria-hidden className="mt-6 flex items-center gap-2 pl-1.5 text-accent sm:pl-2.5">
                <Doodle kind="heart" className="os-float size-7 [--tilt:-10deg]" />
                <span className="os-hand text-2xl text-muted">to be continued…</span>
              </p>
            </div>
          )}
        </div>
        <div className="lg:sticky lg:top-20">
          <MilestoneForm key={editing?.id ?? "new"} milestone={editing} today={todayIn(await getViewerTimeZone())} />
        </div>
      </div>
    </div>
  );
}
