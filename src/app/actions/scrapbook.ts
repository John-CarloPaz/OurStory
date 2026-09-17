"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { describeError } from "@/lib/errors";
import { scrapbookSchema } from "@/lib/scrapbook/model";
import { requireActiveSpace } from "@/lib/tenant";
import { uuid } from "@/lib/validation";

type SaveResult = { ok: true; updatedAt: string } | { ok: false; error: string; conflict?: boolean };

const inputSchema = z.object({
  journalId: uuid,
  scrapbook: scrapbookSchema,
  /** scrapbook_updated_at the editor started from (null if the page was never saved). */
  baseUpdatedAt: z.string().nullable(),
});

/**
 * Saves a scrapbook page. The journal is read through RLS (another couple's
 * entry simply isn't found), every photo on the page must belong to that
 * entry, and the write only succeeds if nobody saved the page since the
 * editor loaded it, so partners can't silently overwrite each other.
 */
export async function saveScrapbook(input: unknown): Promise<SaveResult> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Something on the page isn't valid. Try removing the last change." };
  const { journalId, scrapbook, baseUpdatedAt } = parsed.data;

  const space = await requireActiveSpace();
  const { supabase } = space;

  const [journalRes, photosRes] = await Promise.all([
    supabase.from("journals").select("id, scrapbook_updated_at").eq("id", journalId).maybeSingle(),
    supabase.from("journal_photos").select("id").eq("journal_id", journalId),
  ]);
  if (!journalRes.data) return { ok: false, error: "We couldn't find that entry." };

  const photoIds = new Set((photosRes.data ?? []).map((p) => p.id));
  const cleaned = {
    ...scrapbook,
    elements: scrapbook.elements.filter((el) => el.type !== "photo" || photoIds.has(el.photoId)),
  };

  let query = supabase
    .from("journals")
    .update({ scrapbook: cleaned, scrapbook_updated_at: new Date().toISOString(), scrapbook_updated_by: space.userId })
    .eq("id", journalId);
  query = baseUpdatedAt ? query.eq("scrapbook_updated_at", baseUpdatedAt) : query.is("scrapbook_updated_at", null);

  const { data, error } = await query.select("scrapbook_updated_at");
  if (error) return { ok: false, error: describeError(error) };
  if (!data?.length) {
    return {
      ok: false,
      conflict: true,
      error: "This page was changed by your partner while you were decorating. Reload to see their version.",
    };
  }

  revalidatePath(`/story/${journalId}`);
  revalidatePath("/story");
  return { ok: true, updatedAt: data[0].scrapbook_updated_at! };
}
