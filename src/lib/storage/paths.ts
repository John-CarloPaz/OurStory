/**
 * Storage layout (mirrors the grammar enforced by storage policies in
 * supabase/migrations/*_storage.sql):
 *
 *   couples/{couple_id}/cover/{uuid}.{ext}
 *   couples/{couple_id}/avatars/{user_id}/{uuid}.{ext}
 *   couples/{couple_id}/journals/{journal_id}/{uuid}.{ext}
 *
 * File names are always generated here. The user's original file name is
 * never used, so it cannot carry path traversal or odd characters.
 */

export const MEDIA_BUCKET = "couple-media";
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const IMAGE_CONTENT_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif"] as const;
export type ImageContentType = (typeof IMAGE_CONTENT_TYPES)[number];

const EXTENSIONS: Record<ImageContentType, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/avif": "avif",
};

const CONTENT_TYPES_BY_EXTENSION = Object.fromEntries(
  Object.entries(EXTENSIONS).map(([type, ext]) => [ext, type]),
) as Record<string, ImageContentType>;

export type ResolvedMediaTarget =
  | { kind: "cover"; coupleId: string }
  | { kind: "avatar"; coupleId: string; userId: string }
  | { kind: "journal_photo"; coupleId: string; journalId: string };

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const FILE = `${UUID}\\.(jpg|png|webp|gif|avif)`;

function directoryFor(target: ResolvedMediaTarget): string {
  switch (target.kind) {
    case "cover":
      return `couples/${target.coupleId}/cover`;
    case "avatar":
      return `couples/${target.coupleId}/avatars/${target.userId}`;
    case "journal_photo":
      return `couples/${target.coupleId}/journals/${target.journalId}`;
  }
}

export function buildMediaPath(target: ResolvedMediaTarget, contentType: ImageContentType): string {
  return `${directoryFor(target)}/${globalThis.crypto.randomUUID()}.${EXTENSIONS[contentType]}`;
}

/** True only when `path` is a generated file directly inside the target's own folder. */
export function isMediaPathFor(path: string, target: ResolvedMediaTarget): boolean {
  const dir = directoryFor(target).toLowerCase();
  if (!/^[0-9a-z/-]+$/.test(dir)) return false;
  return new RegExp(`^${dir}/${FILE}$`).test(path);
}

export function splitMediaPath(path: string): { directory: string; fileName: string } {
  const index = path.lastIndexOf("/");
  return { directory: path.slice(0, index), fileName: path.slice(index + 1) };
}

export function contentTypeForPath(path: string): ImageContentType | null {
  const ext = path.split(".").pop() ?? "";
  return CONTENT_TYPES_BY_EXTENSION[ext] ?? null;
}
