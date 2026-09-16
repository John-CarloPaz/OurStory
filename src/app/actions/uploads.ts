"use server";

import { revalidatePath } from "next/cache";
import { describeError } from "@/lib/errors";
import { parseInput } from "@/lib/forms";
import {
  MEDIA_BUCKET,
  buildMediaPath,
  contentTypeForPath,
  isMediaPathFor,
  splitMediaPath,
  type ResolvedMediaTarget,
} from "@/lib/storage/paths";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { requireActiveSpace, type ActiveSpace } from "@/lib/tenant";
import { completeUploadSchema, prepareUploadSchema, type uploadTargetSchema } from "@/lib/validation";
import type { z } from "zod";

/**
 * Two-step uploads so large photos go straight from the browser to Supabase
 * Storage (no server body-size limits):
 *
 *   1. prepareUpload  — server validates type/size, resolves the tenant, and
 *                       generates the object path(s) + signed upload tokens.
 *                       Signing runs as the user, so storage RLS applies.
 *   2. browser uploads the bytes with those tokens (bucket re-checks MIME/size).
 *                       Journal photos upload the original plus a small
 *                       thumbnail; covers and avatars upload a resized copy.
 *   3. completeUpload — server re-derives the expected folder, checks every
 *                       path is inside it, confirms the objects exist, and
 *                       records them in the database.
 */

type UploadTarget = z.infer<typeof uploadTargetSchema>;
type Result<T> = { ok: true; value: T } | { ok: false; error: string };

async function resolveTarget(space: ActiveSpace, target: UploadTarget): Promise<ResolvedMediaTarget | null> {
  switch (target.kind) {
    case "cover":
      return { kind: "cover", coupleId: space.coupleId };
    case "avatar":
      return { kind: "avatar", coupleId: space.coupleId, userId: space.userId };
    case "journal_photo": {
      // Read through RLS: another tenant's journal id resolves to nothing.
      const { data } = await space.supabase.from("journals").select("id, couple_id").eq("id", target.journalId).maybeSingle();
      return data ? { kind: "journal_photo", coupleId: data.couple_id, journalId: data.id } : null;
    }
  }
}

async function findObject(supabase: SupabaseServerClient, path: string) {
  const { directory, fileName } = splitMediaPath(path);
  const { data } = await supabase.storage.from(MEDIA_BUCKET).list(directory, { search: fileName, limit: 1 });
  return data?.find((o) => o.name === fileName) ?? null;
}

export async function prepareUpload(
  input: unknown,
): Promise<Result<{ path: string; token: string; thumbnail: { path: string; token: string } | null }>> {
  const parsed = parseInput(prepareUploadSchema, input);
  if (!parsed.ok) return { ok: false, error: "Please choose a JPEG, PNG, WebP, GIF or AVIF image up to 15 MB." };

  const space = await requireActiveSpace();
  const target = await resolveTarget(space, parsed.data.target);
  if (!target) return { ok: false, error: "We couldn't find where to put that photo." };

  const bucket = space.supabase.storage.from(MEDIA_BUCKET);
  const path = buildMediaPath(target, parsed.data.contentType);
  const signed = await bucket.createSignedUploadUrl(path);
  if (signed.error) return { ok: false, error: "Upload isn't available right now. Please try again." };

  let thumbnail: { path: string; token: string } | null = null;
  if (parsed.data.thumbnail && target.kind === "journal_photo") {
    const thumbPath = buildMediaPath(target, parsed.data.thumbnail.contentType);
    const thumbSigned = await bucket.createSignedUploadUrl(thumbPath);
    if (!thumbSigned.error) thumbnail = { path: thumbPath, token: thumbSigned.data.token };
  }

  return { ok: true, value: { path, token: signed.data.token, thumbnail } };
}

export async function completeUpload(input: unknown): Promise<Result<null>> {
  const parsed = parseInput(completeUploadSchema, input);
  if (!parsed.ok) return { ok: false, error: "That upload couldn't be saved." };

  const space = await requireActiveSpace();
  const target = await resolveTarget(space, parsed.data.target);
  const { path, thumbPath } = parsed.data;
  if (!target || !isMediaPathFor(path, target)) return { ok: false, error: "That upload couldn't be saved." };
  if (thumbPath && (target.kind !== "journal_photo" || thumbPath === path || !isMediaPathFor(thumbPath, target))) {
    return { ok: false, error: "That upload couldn't be saved." };
  }

  const [object, thumbObject] = await Promise.all([
    findObject(space.supabase, path),
    thumbPath ? findObject(space.supabase, thumbPath) : Promise.resolve(null),
  ]);
  const contentType = contentTypeForPath(path);
  if (!object || !contentType) return { ok: false, error: "The upload didn't finish. Please try again." };

  const removePrevious = async (previous: string | null) => {
    if (previous && previous !== path) await space.supabase.storage.from(MEDIA_BUCKET).remove([previous]);
  };

  switch (target.kind) {
    case "journal_photo": {
      const size = Number((object.metadata as { size?: number } | null)?.size) || null;
      const { error } = await space.supabase.from("journal_photos").insert({
        couple_id: target.coupleId,
        journal_id: target.journalId,
        uploaded_by: space.userId,
        storage_path: path,
        // A thumbnail that failed to upload is simply skipped; the original is used instead.
        thumb_path: thumbObject ? thumbPath : null,
        width: parsed.data.width ?? null,
        height: parsed.data.height ?? null,
        content_type: contentType,
        size_bytes: size,
        caption: parsed.data.caption || null,
      });
      if (error) return { ok: false, error: describeError(error) };
      revalidatePath(`/story/${target.journalId}`);
      revalidatePath("/memories");
      revalidatePath("/home");
      break;
    }
    case "cover": {
      const previous = space.couple.cover_path;
      const { error } = await space.supabase.from("couples").update({ cover_path: path }).eq("id", target.coupleId);
      if (error) return { ok: false, error: describeError(error) };
      await removePrevious(previous);
      revalidatePath("/", "layout");
      break;
    }
    case "avatar": {
      const previous = space.me.avatarPath;
      const { error } = await space.supabase
        .from("couple_members")
        .update({ avatar_path: path })
        .eq("couple_id", target.coupleId)
        .eq("user_id", space.userId);
      if (error) return { ok: false, error: describeError(error) };
      await removePrevious(previous);
      revalidatePath("/", "layout");
      break;
    }
  }

  return { ok: true, value: null };
}

export async function removeCover(): Promise<void> {
  const space = await requireActiveSpace();
  const previous = space.couple.cover_path;
  if (!previous) return;
  await space.supabase.from("couples").update({ cover_path: null }).eq("id", space.coupleId);
  await space.supabase.storage.from(MEDIA_BUCKET).remove([previous]);
  revalidatePath("/", "layout");
}

export async function removeAvatar(): Promise<void> {
  const space = await requireActiveSpace();
  const previous = space.me.avatarPath;
  if (!previous) return;
  await space.supabase
    .from("couple_members")
    .update({ avatar_path: null })
    .eq("couple_id", space.coupleId)
    .eq("user_id", space.userId);
  await space.supabase.storage.from(MEDIA_BUCKET).remove([previous]);
  revalidatePath("/", "layout");
}
