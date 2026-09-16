#!/usr/bin/env node
/**
 * One-off backfill for images uploaded before thumbnails existed:
 *   - journal photos without a thumbnail get a 720px WebP thumbnail + dimensions
 *     (additive: originals are untouched)
 *   - with --shrink-covers-avatars: covers larger than 700 KB are replaced by a
 *     2400px copy and avatars larger than 200 KB by a 512px copy. The originals
 *     of those are DELETED, so this part is opt-in.
 *
 * Dry run by default. Pass --apply to make changes.
 * Uses SUPABASE_SECRET_KEY from .env.local (service role; server-side only).
 *
 *   node scripts/backfill-image-variants.mjs            # show what would change
 *   node scripts/backfill-image-variants.mjs --apply    # add thumbnails
 *   node scripts/backfill-image-variants.mjs --apply --shrink-covers-avatars
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { createClient } from "@supabase/supabase-js";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const env = parseEnv(readFileSync(join(root, ".env.local"), "utf8"));
const apply = process.argv.includes("--apply");
const shrinkCoversAvatars = process.argv.includes("--shrink-covers-avatars");
const BUCKET = "couple-media";
const CACHE_CONTROL = "31536000";

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const storage = admin.storage.from(BUCKET);

const kb = (bytes) => `${Math.round(bytes / 1024)} KB`;
const folderOf = (path) => path.slice(0, path.lastIndexOf("/"));

async function objectSize(path) {
  const { data } = await storage.list(folderOf(path), { search: path.slice(path.lastIndexOf("/") + 1), limit: 1 });
  return Number(data?.[0]?.metadata?.size ?? 0);
}

async function download(path) {
  const { data, error } = await storage.download(path);
  if (error) throw new Error(`download ${path}: ${error.message}`);
  return Buffer.from(await data.arrayBuffer());
}

async function orientedSize(buffer) {
  const meta = await sharp(buffer).metadata();
  if (meta.autoOrient) return meta.autoOrient;
  const swap = (meta.orientation ?? 1) >= 5;
  return { width: swap ? meta.height : meta.width, height: swap ? meta.width : meta.height };
}

async function resizeToWebp(buffer, maxEdge, quality) {
  return sharp(buffer, { failOn: "none" })
    .rotate()
    .resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true })
    .webp({ quality })
    .toBuffer();
}

async function upload(path, buffer) {
  const { error } = await storage.upload(path, buffer, { contentType: "image/webp", cacheControl: CACHE_CONTROL });
  if (error) throw new Error(`upload ${path}: ${error.message}`);
}

let changes = 0;

// Journal photos -----------------------------------------------------------------
const photos = await admin
  .from("journal_photos")
  .select("id, storage_path, content_type")
  .is("thumb_path", null)
  .neq("content_type", "image/gif");
if (photos.error) throw photos.error;

for (const photo of photos.data) {
  const original = await download(photo.storage_path);
  const { width, height } = await orientedSize(original);
  const thumb = await resizeToWebp(original, 720, 80);
  const thumbPath = `${folderOf(photo.storage_path)}/${randomUUID()}.webp`;
  console.log(`photo ${photo.id}: ${kb(original.length)} original (${width}x${height}) -> ${kb(thumb.length)} thumbnail`);
  changes++;
  if (!apply) continue;
  await upload(thumbPath, thumb);
  const { error } = await admin.from("journal_photos").update({ thumb_path: thumbPath, width, height }).eq("id", photo.id);
  if (error) {
    await storage.remove([thumbPath]);
    throw error;
  }
}

// Covers and avatars ----------------------------------------------------------------
async function shrinkReplaced({ label, path, threshold, maxEdge, newPath, save }) {
  if (!shrinkCoversAvatars) {
    const size = await objectSize(path);
    if (size > threshold) console.log(`${label}: ${kb(size)} (skipped; pass --shrink-covers-avatars to replace it with a smaller copy)`);
    return;
  }
  const size = await objectSize(path);
  if (size <= threshold) return;
  const original = await download(path);
  const resized = await resizeToWebp(original, maxEdge, 86);
  if (resized.length >= original.length) return;
  console.log(`${label}: ${kb(original.length)} -> ${kb(resized.length)}`);
  changes++;
  if (!apply) return;
  await upload(newPath, resized);
  const { error } = await save(newPath);
  if (error) {
    await storage.remove([newPath]);
    throw error;
  }
  await storage.remove([path]);
}

const couples = await admin.from("couples").select("id, cover_path").not("cover_path", "is", null);
if (couples.error) throw couples.error;
for (const couple of couples.data) {
  await shrinkReplaced({
    label: `cover ${couple.id}`,
    path: couple.cover_path,
    threshold: 700 * 1024,
    maxEdge: 2400,
    newPath: `couples/${couple.id}/cover/${randomUUID()}.webp`,
    save: (newPath) => admin.from("couples").update({ cover_path: newPath }).eq("id", couple.id),
  });
}

const members = await admin.from("couple_members").select("couple_id, user_id, avatar_path").not("avatar_path", "is", null);
if (members.error) throw members.error;
for (const member of members.data) {
  await shrinkReplaced({
    label: `avatar ${member.user_id}`,
    path: member.avatar_path,
    threshold: 200 * 1024,
    maxEdge: 512,
    newPath: `couples/${member.couple_id}/avatars/${member.user_id}/${randomUUID()}.webp`,
    save: (newPath) =>
      admin.from("couple_members").update({ avatar_path: newPath }).eq("couple_id", member.couple_id).eq("user_id", member.user_id),
  });
}

console.log(changes === 0 ? "Nothing to backfill." : apply ? `Applied ${changes} change(s).` : `${changes} change(s) found. Re-run with --apply to make them.`);
