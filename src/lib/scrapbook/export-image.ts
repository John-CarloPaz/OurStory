/**
 * Browser-only: turns a rendered scrapbook page into a PNG and hands it to the
 * person (a download, or the share sheet on iPhone/iPad where "Save Image"
 * puts it straight into Photos).
 *
 * The capture library is loaded only when someone actually exports.
 */

/** Width the page is laid out at for export, in CSS px. Rendered at 2x: 2000px wide. */
export const EXPORT_PAGE_WIDTH = 1000;
const EXPORT_SCALE = 2;

export async function renderPagePng(node: HTMLElement): Promise<Blob> {
  await document.fonts.ready;
  await Promise.all(
    Array.from(node.querySelectorAll("img"), (img) =>
      img.complete
        ? img.decode().catch(() => undefined)
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true });
            img.addEventListener("error", () => resolve(), { once: true });
          }),
    ),
  );
  const { domToBlob } = await import("modern-screenshot");
  return domToBlob(node, { scale: EXPORT_SCALE, type: "image/png", timeout: 30_000 });
}

function isAppleTouchDevice(): boolean {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}

/**
 * "saved": downloaded or shared. "cancelled": the share sheet was dismissed.
 * "needs-tap": the browser wants a fresh tap before sharing (the image took a
 * moment to make); call shareFile() from the next click.
 */
export type DeliverResult = "saved" | "cancelled" | "needs-tap";

export async function shareFile(file: File): Promise<DeliverResult> {
  try {
    await navigator.share({ files: [file] });
    return "saved";
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") return "cancelled";
    if (error instanceof DOMException && error.name === "NotAllowedError") return "needs-tap";
    throw error;
  }
}

export async function deliverPng(blob: Blob, fileName: string): Promise<{ result: DeliverResult; file: File }> {
  const file = new File([blob], fileName, { type: "image/png" });
  if (isAppleTouchDevice() && navigator.canShare?.({ files: [file] })) {
    return { result: await shareFile(file), file };
  }
  downloadBlob(blob, fileName);
  return { result: "saved", file };
}
