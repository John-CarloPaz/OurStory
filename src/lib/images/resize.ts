import type { ImageContentType } from "@/lib/storage/paths";

/**
 * Browser-side image resizing, used before upload so grids and headers load
 * small files instead of multi-megabyte camera originals. Re-encoding also
 * drops embedded metadata (such as GPS location) from the resized copy.
 */

export type ResizedImage = {
  blob: Blob;
  contentType: ImageContentType;
  /** Dimensions of the resized image. */
  width: number;
  height: number;
  /** Dimensions of the source, after applying its EXIF orientation. */
  sourceWidth: number;
  sourceHeight: number;
};

function canvasToBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Returns null when the browser can't decode or encode the image. */
export async function resizeImage(file: Blob, maxEdge: number, quality = 0.82): Promise<ResizedImage | null> {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return null;
  }

  try {
    const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.imageSmoothingQuality = "high";
    context.drawImage(bitmap, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, "image/webp", quality);
    let contentType: ImageContentType = "image/webp";

    // Older Safari cannot encode WebP and silently returns PNG; use JPEG instead.
    if (!blob || blob.type !== "image/webp") {
      context.globalCompositeOperation = "destination-over";
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, width, height);
      blob = await canvasToBlob(canvas, "image/jpeg", quality);
      contentType = "image/jpeg";
    }
    if (!blob) return null;

    return { blob, contentType, width, height, sourceWidth: bitmap.width, sourceHeight: bitmap.height };
  } finally {
    bitmap.close();
  }
}
