"use client";

import { ImagePlus, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { completeUpload, prepareUpload } from "@/app/actions/uploads";
import { resizeImage, type ResizedImage } from "@/lib/images/resize";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { IMAGE_CONTENT_TYPES, MAX_UPLOAD_BYTES, MEDIA_BUCKET, type ImageContentType } from "@/lib/storage/paths";

type Target = { kind: "cover" } | { kind: "avatar" } | { kind: "journal_photo"; journalId: string };

/** Longest edge, in pixels, of what gets stored for each kind of image. */
const COVER_MAX_EDGE = 2400;
const AVATAR_MAX_EDGE = 512;
const THUMBNAIL_MAX_EDGE = 720;

/** Every stored file has a unique name and never changes, so it can be cached for a year. */
const CACHE_CONTROL = "31536000";

/**
 * Upload flow: ask the server for paths + signed tokens, send the bytes
 * directly to Supabase Storage, then ask the server to record them. File names
 * and folders are chosen by the server; the browser only supplies bytes.
 *
 * Journal photos keep the original and add a small thumbnail for grids.
 * Covers and avatars are resized before upload (the original isn't needed).
 */
export function ImageUpload({
  target,
  label = "Add photos",
  multiple = false,
  variant = "button",
}: {
  target: Target;
  label?: string;
  multiple?: boolean;
  variant?: "button" | "tile";
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function uploadOne(file: File): Promise<string | null> {
    if (!IMAGE_CONTENT_TYPES.includes(file.type as ImageContentType)) {
      return `${file.name}: please choose a JPEG, PNG, WebP, GIF or AVIF image.`;
    }
    if (file.size > MAX_UPLOAD_BYTES) return `${file.name}: images can be up to 15 MB.`;

    const isGif = file.type === "image/gif"; // resizing would drop the animation
    let main: { blob: Blob; contentType: ImageContentType } = { blob: file, contentType: file.type as ImageContentType };
    let thumbnail: ResizedImage | null = null;
    let dimensions: { width: number; height: number } | null = null;

    if (!isGif && target.kind !== "journal_photo") {
      const resized = await resizeImage(file, target.kind === "cover" ? COVER_MAX_EDGE : AVATAR_MAX_EDGE, 0.86);
      if (resized && resized.blob.size < file.size) main = { blob: resized.blob, contentType: resized.contentType };
    }
    if (!isGif && target.kind === "journal_photo") {
      thumbnail = await resizeImage(file, THUMBNAIL_MAX_EDGE, 0.8);
      if (thumbnail) dimensions = { width: thumbnail.sourceWidth, height: thumbnail.sourceHeight };
    }

    const prepared = await prepareUpload({
      target,
      contentType: main.contentType,
      size: main.blob.size,
      thumbnail: thumbnail ? { contentType: thumbnail.contentType, size: thumbnail.blob.size } : undefined,
    });
    if (!prepared.ok) return prepared.error;

    const bucket = createSupabaseBrowserClient().storage.from(MEDIA_BUCKET);
    const thumbTarget = prepared.value.thumbnail;
    const [mainUpload, thumbUpload] = await Promise.all([
      bucket.uploadToSignedUrl(prepared.value.path, prepared.value.token, main.blob, {
        contentType: main.contentType,
        cacheControl: CACHE_CONTROL,
      }),
      thumbnail && thumbTarget
        ? bucket.uploadToSignedUrl(thumbTarget.path, thumbTarget.token, thumbnail.blob, {
            contentType: thumbnail.contentType,
            cacheControl: CACHE_CONTROL,
          })
        : Promise.resolve(null),
    ]);
    if (mainUpload.error) return `${file.name}: the upload didn't go through.`;

    const completed = await completeUpload({
      target,
      path: prepared.value.path,
      thumbPath: thumbTarget && thumbUpload && !thumbUpload.error ? thumbTarget.path : undefined,
      width: dimensions?.width,
      height: dimensions?.height,
    });
    return completed.ok ? null : completed.error;
  }

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError(null);
    const list = Array.from(files);
    const errors: string[] = [];
    for (const [index, file] of list.entries()) {
      setProgress(list.length > 1 ? `Uploading ${index + 1} of ${list.length}…` : "Uploading…");
      const problem = await uploadOne(file);
      if (problem) errors.push(problem);
    }
    setProgress(null);
    if (inputRef.current) inputRef.current.value = "";
    if (errors.length) setError(errors.join(" "));
    router.refresh();
  }

  const busy = progress !== null;
  const content = busy ? (
    <>
      <Loader2 className="size-4 animate-spin" aria-hidden /> {progress}
    </>
  ) : (
    <>
      <ImagePlus className="size-4" aria-hidden /> {label}
    </>
  );

  return (
    <div className={variant === "tile" ? "h-full" : undefined}>
      <label
        className={
          variant === "tile"
            ? "flex aspect-square h-full w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-line text-sm text-muted transition hover:border-accent hover:text-ink"
            : "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full border border-line bg-card px-4 text-sm font-medium text-ink transition hover:border-accent/60"
        }
        aria-disabled={busy}
      >
        {content}
        <input
          ref={inputRef}
          type="file"
          accept={IMAGE_CONTENT_TYPES.join(",")}
          multiple={multiple}
          disabled={busy}
          className="sr-only"
          onChange={(e) => onFiles(e.target.files)}
        />
      </label>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}
