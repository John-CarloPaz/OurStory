"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { describeError } from "@/lib/errors";
import { formError, formSuccess, parseForm, type FormState } from "@/lib/forms";
import { MEDIA_BUCKET } from "@/lib/storage/paths";
import { requireActiveSpace } from "@/lib/tenant";
import { journalSchema, photoCaptionSchema, reflectionSchema, uuid } from "@/lib/validation";

/**
 * Journals, reflections and photos.
 *
 * Pattern for actions on an existing resource: take only the resource id,
 * read the resource AS THE USER (RLS hides other tenants), and use the
 * couple_id stored on that row. A tampered id simply finds nothing.
 */

async function findJournal(id: string) {
  const space = await requireActiveSpace();
  const { data } = await space.supabase.from("journals").select("id, couple_id").eq("id", id).maybeSingle();
  return { space, journal: data };
}

async function syncPlaceLinks(
  supabase: Awaited<ReturnType<typeof requireActiveSpace>>["supabase"],
  coupleId: string,
  journalId: string,
  placeIds: string[],
) {
  const { data: existing } = await supabase.from("place_journals").select("place_id").eq("journal_id", journalId);
  const current = new Set((existing ?? []).map((r) => r.place_id));
  const wanted = new Set(placeIds);

  const toRemove = [...current].filter((id) => !wanted.has(id));
  const toAdd = [...wanted].filter((id) => !current.has(id));

  if (toRemove.length) {
    await supabase.from("place_journals").delete().eq("journal_id", journalId).in("place_id", toRemove);
  }
  if (toAdd.length) {
    // Composite foreign keys reject places from any other couple.
    await supabase
      .from("place_journals")
      .insert(toAdd.map((placeId) => ({ couple_id: coupleId, place_id: placeId, journal_id: journalId })));
  }
}

export async function createJournal(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(journalSchema, formData);
  if (!parsed.ok) return parsed.state;

  const space = await requireActiveSpace();
  const { data, error } = await space.supabase
    .from("journals")
    .insert({
      couple_id: space.coupleId,
      created_by: space.userId,
      title: parsed.data.title,
      entry_date: parsed.data.entryDate,
      mood: parsed.data.mood,
      body: parsed.data.body,
    })
    .select("id")
    .single();
  if (error) return formError(describeError(error));

  await syncPlaceLinks(space.supabase, space.coupleId, data.id, parsed.data["placeIds[]"]);
  revalidatePath("/story");
  revalidatePath("/home");
  redirect(`/story/${data.id}`);
}

export async function updateJournal(_prev: FormState, formData: FormData): Promise<FormState> {
  const journalId = uuid.safeParse(formData.get("journalId"));
  const parsed = parseForm(journalSchema, formData);
  if (!journalId.success) return formError("We couldn't find that entry.");
  if (!parsed.ok) return parsed.state;

  const { space, journal } = await findJournal(journalId.data);
  if (!journal) return formError("We couldn't find that entry.");

  const { error } = await space.supabase
    .from("journals")
    .update({
      title: parsed.data.title,
      entry_date: parsed.data.entryDate,
      mood: parsed.data.mood,
      body: parsed.data.body,
    })
    .eq("id", journal.id);
  if (error) return formError(describeError(error));

  await syncPlaceLinks(space.supabase, journal.couple_id, journal.id, parsed.data["placeIds[]"]);
  revalidatePath("/story");
  redirect(`/story/${journal.id}`);
}

export async function deleteJournal(formData: FormData): Promise<void> {
  const journalId = uuid.safeParse(formData.get("journalId"));
  if (!journalId.success) redirect("/story");

  const { space, journal } = await findJournal(journalId.data);
  if (!journal) redirect("/story");

  const { data: photos } = await space.supabase.from("journal_photos").select("storage_path, thumb_path").eq("journal_id", journal.id);

  // Cascades to this journal's photos, reflections and place links only.
  const { data: deleted } = await space.supabase.from("journals").delete().eq("id", journal.id).select("id");

  if (deleted?.length && photos?.length) {
    await space.supabase.storage.from(MEDIA_BUCKET).remove(photos.flatMap((p) => (p.thumb_path ? [p.storage_path, p.thumb_path] : [p.storage_path])));
  }

  revalidatePath("/story");
  revalidatePath("/memories");
  revalidatePath("/home");
  redirect("/story");
}

export async function addReflection(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(reflectionSchema, formData);
  if (!parsed.ok) return parsed.state;

  const { space, journal } = await findJournal(parsed.data.journalId);
  if (!journal) return formError("We couldn't find that entry.");

  const { error } = await space.supabase.from("journal_reflections").insert({
    couple_id: journal.couple_id,
    journal_id: journal.id,
    author_id: space.userId,
    visibility: parsed.data.visibility,
    body: parsed.data.body,
  });
  if (error) return formError(describeError(error));

  revalidatePath(`/story/${journal.id}`);
  return formSuccess(parsed.data.visibility === "private" ? "Saved privately. Only you can see it." : "Shared with your partner.");
}

export async function deleteReflection(formData: FormData): Promise<void> {
  const id = uuid.safeParse(formData.get("reflectionId"));
  if (!id.success) return;

  const space = await requireActiveSpace();
  const { data } = await space.supabase
    .from("journal_reflections")
    .delete()
    .eq("id", id.data)
    .eq("author_id", space.userId)
    .select("journal_id");

  if (data?.[0]) revalidatePath(`/story/${data[0].journal_id}`);
}

export async function updatePhotoCaption(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(photoCaptionSchema, formData);
  if (!parsed.ok) return parsed.state;

  const space = await requireActiveSpace();
  const { data, error } = await space.supabase
    .from("journal_photos")
    .update({ caption: parsed.data.caption })
    .eq("id", parsed.data.photoId)
    .select("journal_id");
  if (error || !data?.length) return formError(describeError(error, "We couldn't find that photo."));

  revalidatePath(`/story/${data[0].journal_id}`);
  revalidatePath("/memories");
  return formSuccess("Caption saved.");
}

export async function deletePhoto(formData: FormData): Promise<void> {
  const id = uuid.safeParse(formData.get("photoId"));
  if (!id.success) return;

  const space = await requireActiveSpace();
  const { data } = await space.supabase.from("journal_photos").delete().eq("id", id.data).select("journal_id, storage_path, thumb_path");
  const photo = data?.[0];
  if (!photo) return;

  await space.supabase.storage.from(MEDIA_BUCKET).remove(photo.thumb_path ? [photo.storage_path, photo.thumb_path] : [photo.storage_path]);
  revalidatePath(`/story/${photo.journal_id}`);
  revalidatePath("/memories");
}
