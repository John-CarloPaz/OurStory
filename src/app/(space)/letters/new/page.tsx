import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/ui/layout";
import { todayIn } from "@/lib/dates";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { LetterForm } from "../letter-form";

export const metadata: Metadata = { title: "Write a letter" };

function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export default async function NewLetterPage() {
  const space = await requireActiveSpace();
  if (!space.partner) redirect("/letters");

  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <PageHeader
        eyebrow="A letter"
        title={`For ${space.partner.displayName}`}
        note="from the heart"
        description="Address the envelope, write your letter, then choose the day it opens."
      />
      <LetterForm recipientName={space.partner.displayName} defaultUnlockDate={addDays(todayIn(await getViewerTimeZone()), 7)} />
    </div>
  );
}
