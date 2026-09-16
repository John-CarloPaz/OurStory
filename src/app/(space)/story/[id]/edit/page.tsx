import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui/layout";
import { todayIn } from "@/lib/dates";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { uuid } from "@/lib/validation";
import { JournalForm } from "../../journal-form";

export const metadata: Metadata = { title: "Edit entry" };

export default async function EditJournalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!uuid.safeParse(id).success) notFound();

  const space = await requireActiveSpace();
  const [journal, places, links] = await Promise.all([
    space.supabase.from("journals").select("id, title, entry_date, mood, body").eq("id", id).maybeSingle(),
    space.supabase.from("places").select("id, name, category").order("name"),
    space.supabase.from("place_journals").select("place_id").eq("journal_id", id),
  ]);
  // RLS: an entry from another space is indistinguishable from one that doesn't exist.
  if (!journal.data) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="Edit entry" title={journal.data.title} />
      <JournalForm
        journal={journal.data}
        places={places.data ?? []}
        linkedPlaceIds={(links.data ?? []).map((l) => l.place_id)}
        today={todayIn(await getViewerTimeZone())}
      />
    </div>
  );
}
