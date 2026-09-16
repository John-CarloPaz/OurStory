"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { zonedTimeToUtc } from "@/lib/dates";
import { describeError } from "@/lib/errors";
import { formError, formSuccess, parseForm, type FormState } from "@/lib/forms";
import { requireActiveSpace } from "@/lib/tenant";
import { getViewerTimeZone } from "@/lib/timezone";
import { eventSchema, letterSchema, milestoneSchema, noteSchema, placeSchema, uuid } from "@/lib/validation";

/**
 * Events, milestones, places, notes and letters.
 *
 * New rows are written to the active couple (resolved from membership on the
 * server). Updates and deletes filter by id only and rely on RLS: an id from
 * another tenant matches zero rows. Updates that must change exactly one row
 * select it back to tell "not found" from success.
 */

function idFrom(formData: FormData, field: string): string | null {
  const parsed = uuid.safeParse(formData.get(field));
  return parsed.success ? parsed.data : null;
}

// Events -----------------------------------------------------------------------------

export async function saveEvent(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(eventSchema, formData);
  if (!parsed.ok) return parsed.state;
  const eventId = idFrom(formData, "eventId");

  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();
  const { date, allDay, startTime, endTime } = parsed.data;

  const values = {
    title: parsed.data.title,
    description: parsed.data.description,
    location: parsed.data.location,
    place_id: parsed.data.placeId,
    all_day: allDay,
    starts_at: zonedTimeToUtc(date, allDay ? "00:00" : startTime!, tz).toISOString(),
    ends_at: !allDay && endTime ? zonedTimeToUtc(date, endTime, tz).toISOString() : null,
  };

  const { data, error } = eventId
    ? await space.supabase.from("events").update(values).eq("id", eventId).select("id")
    : await space.supabase
        .from("events")
        .insert({ ...values, couple_id: space.coupleId, created_by: space.userId })
        .select("id");
  if (error) return formError(describeError(error));
  if (!data?.length) return formError("We couldn't find that event.");

  revalidatePath("/calendar");
  revalidatePath("/home");
  if (eventId) redirect(`/calendar?month=${date.slice(0, 7)}&date=${date}`);
  return formSuccess("Added to your calendar.");
}

export async function deleteEvent(formData: FormData): Promise<void> {
  const id = idFrom(formData, "eventId");
  if (!id) return;
  const space = await requireActiveSpace();
  await space.supabase.from("events").delete().eq("id", id);
  revalidatePath("/calendar");
  revalidatePath("/home");
}

// Milestones ---------------------------------------------------------------------------

export async function saveMilestone(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(milestoneSchema, formData);
  if (!parsed.ok) return parsed.state;
  const milestoneId = idFrom(formData, "milestoneId");

  const space = await requireActiveSpace();
  const values = {
    title: parsed.data.title,
    occurred_on: parsed.data.occurredOn,
    icon: parsed.data.icon,
    description: parsed.data.description,
  };

  const { data, error } = milestoneId
    ? await space.supabase.from("milestones").update(values).eq("id", milestoneId).select("id")
    : await space.supabase
        .from("milestones")
        .insert({ ...values, couple_id: space.coupleId, created_by: space.userId })
        .select("id");
  if (error) return formError(describeError(error));
  if (!data?.length) return formError("We couldn't find that milestone.");

  revalidatePath("/milestones");
  revalidatePath("/home");
  if (milestoneId) redirect("/milestones");
  return formSuccess("Milestone added.");
}

export async function deleteMilestone(formData: FormData): Promise<void> {
  const id = idFrom(formData, "milestoneId");
  if (!id) return;
  const space = await requireActiveSpace();
  await space.supabase.from("milestones").delete().eq("id", id);
  revalidatePath("/milestones");
  revalidatePath("/home");
}

// Places -------------------------------------------------------------------------------

export async function savePlace(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(placeSchema, formData);
  if (!parsed.ok) return parsed.state;
  const placeId = idFrom(formData, "placeId");

  const space = await requireActiveSpace();
  const values = {
    name: parsed.data.name,
    category: parsed.data.category,
    status: parsed.data.status,
    address: parsed.data.address,
    first_visited_on: parsed.data.firstVisitedOn,
    description: parsed.data.description,
  };

  const { data, error } = placeId
    ? await space.supabase.from("places").update(values).eq("id", placeId).select("id")
    : await space.supabase
        .from("places")
        .insert({ ...values, couple_id: space.coupleId, created_by: space.userId })
        .select("id");
  if (error) return formError(describeError(error));
  if (!data?.length) return formError("We couldn't find that place.");

  revalidatePath("/places");
  if (placeId) redirect("/places");
  return formSuccess("Place saved.");
}

export async function deletePlace(formData: FormData): Promise<void> {
  const id = idFrom(formData, "placeId");
  if (!id) return;
  const space = await requireActiveSpace();
  await space.supabase.from("places").delete().eq("id", id);
  revalidatePath("/places");
}

// Notes --------------------------------------------------------------------------------

export async function saveNote(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(noteSchema, formData);
  if (!parsed.ok) return parsed.state;
  const noteId = idFrom(formData, "noteId");

  const space = await requireActiveSpace();
  const values = {
    title: parsed.data.title,
    body: parsed.data.body,
    visibility: parsed.data.visibility,
    pinned: parsed.data.pinned,
  };

  // Only the author can update a note (RLS); author_id is fixed at insert.
  const { data, error } = noteId
    ? await space.supabase.from("notes").update(values).eq("id", noteId).eq("author_id", space.userId).select("id")
    : await space.supabase
        .from("notes")
        .insert({ ...values, couple_id: space.coupleId, author_id: space.userId })
        .select("id");
  if (error) return formError(describeError(error));
  if (!data?.length) return formError("We couldn't find that note.");

  revalidatePath("/notes");
  if (noteId) redirect("/notes");
  return formSuccess(parsed.data.visibility === "private" ? "Saved. Only you can see this note." : "Saved and shared.");
}

export async function toggleNotePin(formData: FormData): Promise<void> {
  const id = idFrom(formData, "noteId");
  if (!id) return;
  const space = await requireActiveSpace();
  await space.supabase
    .from("notes")
    .update({ pinned: formData.get("pinned") === "true" })
    .eq("id", id)
    .eq("author_id", space.userId);
  revalidatePath("/notes");
}

export async function deleteNote(formData: FormData): Promise<void> {
  const id = idFrom(formData, "noteId");
  if (!id) return;
  const space = await requireActiveSpace();
  await space.supabase.from("notes").delete().eq("id", id).eq("author_id", space.userId);
  revalidatePath("/notes");
}

// Letters ------------------------------------------------------------------------------

export async function saveLetter(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = parseForm(letterSchema, formData);
  if (!parsed.ok) return parsed.state;
  const letterId = idFrom(formData, "letterId");

  const space = await requireActiveSpace();
  const tz = await getViewerTimeZone();
  const unlockAt = zonedTimeToUtc(parsed.data.unlockDate, parsed.data.unlockTime, tz).toISOString();

  // Recipient is derived from membership inside the RPC; sealing is enforced by RLS.
  const { error } = letterId
    ? await space.supabase.rpc("update_letter", {
        p_letter_id: letterId,
        p_title: parsed.data.title,
        p_content: parsed.data.content,
        p_unlock_at: unlockAt,
      })
    : await space.supabase.rpc("create_letter", {
        p_couple_id: space.coupleId,
        p_title: parsed.data.title,
        p_content: parsed.data.content,
        p_unlock_at: unlockAt,
      });
  if (error) return formError(describeError(error));

  revalidatePath("/letters");
  revalidatePath("/home");
  redirect("/letters");
}

export async function deleteLetter(formData: FormData): Promise<void> {
  const id = idFrom(formData, "letterId");
  if (!id) return;
  const space = await requireActiveSpace();
  await space.supabase.from("letters").delete().eq("id", id).eq("author_id", space.userId);
  revalidatePath("/letters");
  revalidatePath("/home");
  redirect("/letters");
}

export async function markLetterOpened(letterId: string): Promise<void> {
  const id = uuid.safeParse(letterId);
  if (!id.success) return;
  const space = await requireActiveSpace();
  await space.supabase.rpc("mark_letter_opened", { p_letter_id: id.data });
  revalidatePath("/letters");
}
