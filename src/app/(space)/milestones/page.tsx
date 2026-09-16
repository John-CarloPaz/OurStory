import { Pencil, Sparkles, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { deleteMilestone } from "@/app/actions/content";
import { MilestoneIcon } from "@/components/content-meta";
import { ConfirmSubmit } from "@/components/ui/form";
import { EmptyState, PageHeader } from "@/components/ui/layout";
import { formatCalendarDate, todayIn } from "@/lib/dates";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { uuid } from "@/lib/validation";
import { MilestoneForm } from "./milestone-form";

export const metadata: Metadata = { title: "Milestones" };

export default async function MilestonesPage({ searchParams }: { searchParams: Promise<{ edit?: string }> }) {
  const { edit } = await searchParams;
  const space = await requireActiveSpace();
  const { data } = await space.supabase
    .from("milestones")
    .select("id, title, description, occurred_on, icon")
    .order("occurred_on", { ascending: false });
  const milestones = data ?? [];
  const editing = uuid.safeParse(edit).success ? milestones.find((m) => m.id === edit) : undefined;

  return (
    <div className="os-sections">
      <PageHeader eyebrow="Milestones" title="The moments that changed everything" description="First dates, first homes, the yes, the big trip." />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div>
          {milestones.length === 0 ? (
            <EmptyState icon={<Sparkles className="size-5" />} title="No milestones yet">
              Start with the day your story began.
            </EmptyState>
          ) : (
            <ol className="relative space-y-6 before:absolute before:top-2 before:bottom-2 before:left-5 before:w-px before:bg-line">
              {milestones.map((m) => (
                <li key={m.id} className="relative flex gap-5">
                  <span className="relative z-10 grid size-10 shrink-0 place-items-center rounded-full bg-accent text-on-accent shadow-sm">
                    <MilestoneIcon icon={m.icon} className="size-4" />
                  </span>
                  <div className="os-card min-w-0 flex-1 p-5">
                    <p className="text-xs text-muted">{formatCalendarDate(m.occurred_on)}</p>
                    <h2 className="os-display mt-1 text-2xl leading-snug text-ink">{m.title}</h2>
                    {m.description ? <p className="mt-2 leading-relaxed whitespace-pre-wrap text-muted">{m.description}</p> : null}
                    <div className="mt-4 flex gap-1">
                      <Link href={`/milestones?edit=${m.id}`} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted hover:bg-accent-soft hover:text-ink">
                        <Pencil className="size-3" aria-hidden /> Edit
                      </Link>
                      <form action={deleteMilestone}>
                        <input type="hidden" name="milestoneId" value={m.id} />
                        <ConfirmSubmit message="Delete this milestone?" className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted hover:bg-danger/10 hover:text-danger">
                          <Trash2 className="size-3" aria-hidden /> Delete
                        </ConfirmSubmit>
                      </form>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
        <div className="lg:sticky lg:top-20">
          <MilestoneForm key={editing?.id ?? "new"} milestone={editing} today={todayIn(await getViewerTimeZone())} />
        </div>
      </div>
    </div>
  );
}
