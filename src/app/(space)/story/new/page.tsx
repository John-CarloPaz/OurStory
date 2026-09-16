import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/layout";
import { isValidDate } from "@/lib/calendar";
import { todayIn } from "@/lib/dates";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { JournalForm } from "../journal-form";

export const metadata: Metadata = { title: "New entry" };

export default async function NewJournalPage({ searchParams }: { searchParams: Promise<{ date?: string }> }) {
  const { date } = await searchParams;
  const space = await requireActiveSpace();
  const { data: places } = await space.supabase.from("places").select("id, name, category").order("name");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <PageHeader eyebrow="New entry" title="Write a chapter" />
      <JournalForm places={places ?? []} today={isValidDate(date) ? date : todayIn(await getViewerTimeZone())} />
    </div>
  );
}
