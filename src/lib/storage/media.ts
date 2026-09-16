import "server-only";
import type { SupabaseServerClient } from "@/lib/supabase/server";
import { MEDIA_BUCKET } from "./paths";

/**
 * Signed URLs for private media, reused per viewer.
 *
 * Supabase issues a different signed URL on every call, which would make the
 * browser and CDN download each image again on every page load. Instead, each
 * viewer's URLs are remembered for a few hours so repeat visits hit the cache.
 *
 * Why this does not widen access: URLs are signed as the viewer (storage RLS
 * decides what can be signed), the cache is keyed by viewer, and callers only
 * pass paths that came from rows the viewer could read in this request.
 */

const SIGNED_URL_SECONDS = 6 * 60 * 60;
const MIN_REMAINING_MS = 60 * 60 * 1000;
const MAX_ENTRIES = 5000;

const cache = new Map<string, { url: string; expiresAt: number }>();

export async function signMediaUrls(
  viewer: { supabase: SupabaseServerClient; userId: string },
  paths: Array<string | null | undefined>,
): Promise<Record<string, string>> {
  const unique = [...new Set(paths.filter((p): p is string => Boolean(p)))];
  if (unique.length === 0) return {};

  const now = Date.now();
  const urls: Record<string, string> = {};
  const missing: string[] = [];

  for (const path of unique) {
    const hit = cache.get(`${viewer.userId}:${path}`);
    if (hit && hit.expiresAt - now > MIN_REMAINING_MS) urls[path] = hit.url;
    else missing.push(path);
  }

  if (missing.length) {
    const { data, error } = await viewer.supabase.storage.from(MEDIA_BUCKET).createSignedUrls(missing, SIGNED_URL_SECONDS);
    if (!error && data) {
      const expiresAt = now + SIGNED_URL_SECONDS * 1000;
      for (const item of data) {
        if (!item.path || !item.signedUrl || item.error) continue;
        urls[item.path] = item.signedUrl;
        cache.delete(`${viewer.userId}:${item.path}`);
        cache.set(`${viewer.userId}:${item.path}`, { url: item.signedUrl, expiresAt });
      }
      while (cache.size > MAX_ENTRIES) cache.delete(cache.keys().next().value!);
    }
  }

  return urls;
}

/** The thumbnail when one exists, otherwise the original. */
export function thumbnailOf(photo: { storage_path: string; thumb_path?: string | null }): string {
  return photo.thumb_path ?? photo.storage_path;
}
