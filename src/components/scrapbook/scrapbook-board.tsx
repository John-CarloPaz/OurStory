"use client";

import { Download, Loader2, Paintbrush, Share, Sparkles } from "lucide-react";
import { useRef, useState } from "react";
import { flushSync } from "react-dom";
import { EXPORT_PAGE_WIDTH, deliverPng, renderPagePng, shareFile } from "@/lib/scrapbook/export-image";
import { scrapbookFileName, type Scrapbook } from "@/lib/scrapbook/model";
import { ScrapbookEditor, type EditorPhoto } from "./scrapbook-editor";
import { ScrapbookPage } from "./scrapbook-page";

type ExportState = { status: "idle" } | { status: "rendering" } | { status: "needs-tap"; file: File } | { status: "error" };

/** An entry's scrapbook page: view mode with "Download" and "Decorate" buttons. */
export function ScrapbookBoard({
  journalId,
  title,
  entryDate,
  scrapbook,
  generated,
  saved,
  updatedAt,
  updatedByName,
  photos,
}: {
  journalId: string;
  title: string;
  entryDate: string;
  scrapbook: Scrapbook;
  generated: Scrapbook;
  saved: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
  photos: EditorPhoto[];
}) {
  const [editing, setEditing] = useState(false);
  const [exportState, setExportState] = useState<ExportState>({ status: "idle" });
  const stageRef = useRef<HTMLDivElement>(null);
  const sources = Object.fromEntries(photos.map((p) => [p.id, { thumb: p.thumb, full: p.full }]));

  async function download() {
    if (exportState.status === "rendering") return;
    if (exportState.status === "needs-tap") {
      // A fresh tap, so the share sheet is allowed now.
      const result = await shareFile(exportState.file).catch(() => "error" as const);
      setExportState(result === "error" ? { status: "error" } : { status: "idle" });
      return;
    }

    // Mount a clean, full-size copy of the page off screen and capture that:
    // no buttons, no entrance animation, original photos, same size on every device.
    flushSync(() => setExportState({ status: "rendering" }));
    try {
      const paper = stageRef.current?.querySelector<HTMLElement>(".os-paper");
      if (!paper) throw new Error("Export stage did not render.");
      const blob = await renderPagePng(paper);
      const { result, file } = await deliverPng(blob, scrapbookFileName(title, entryDate));
      setExportState(result === "needs-tap" ? { status: "needs-tap", file } : { status: "idle" });
    } catch (error) {
      console.error("Scrapbook export failed", error);
      setExportState({ status: "error" });
    }
  }

  if (editing) {
    return (
      <ScrapbookEditor
        journalId={journalId}
        initial={scrapbook}
        generated={generated}
        baseUpdatedAt={updatedAt}
        photos={photos}
        onClose={() => setEditing(false)}
      />
    );
  }

  const rendering = exportState.status === "rendering";

  return (
    <div className="relative mx-auto max-w-[44rem]">
      <div className="relative">
        {/* Phones: a row above the page, so the buttons never cover it. Larger screens: floating on the page. */}
        <div className="mb-3 flex items-center justify-end gap-2 sm:absolute sm:top-3 sm:right-3 sm:z-[10000] sm:mb-0">
          <button
            type="button"
            onClick={download}
            disabled={rendering}
            aria-label={exportState.status === "needs-tap" ? "Save image" : "Download as image"}
            title="Download as image"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-[#fffdf8]/90 px-3.5 text-sm font-medium text-[#3b2f2a] shadow-[0_10px_24px_-12px_rgb(40_25_10/0.55)] ring-1 ring-black/5 transition hover:-translate-y-0.5 active:scale-95 disabled:cursor-progress disabled:opacity-80"
          >
            {rendering ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : exportState.status === "needs-tap" ? (
              <Share className="size-4" aria-hidden />
            ) : (
              <Download className="size-4" aria-hidden />
            )}
            {rendering ? "Making image…" : exportState.status === "needs-tap" ? "Save image" : "Download"}
          </button>
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="group inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--os-primary),color-mix(in_srgb,var(--os-primary)_68%,#ff9f7a))] px-4 text-sm font-medium text-on-accent shadow-[0_12px_30px_-10px_var(--os-primary)] transition hover:-translate-y-0.5 active:scale-95"
          >
            <Paintbrush className="size-4 transition-transform group-hover:-rotate-12" aria-hidden />
            Decorate
          </button>
        </div>
        <ScrapbookPage scrapbook={scrapbook} photos={sources} animate />
      </div>

      {exportState.status === "error" ? (
        <p role="alert" className="mt-3 text-center text-sm text-danger">
          Couldn&apos;t make the image. Check your connection and try again.
        </p>
      ) : (
        <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-muted">
          <Sparkles className="size-3.5 text-accent" aria-hidden />
          {saved
            ? updatedByName
              ? `Last decorated by ${updatedByName}`
              : "Decorated together"
            : "We arranged this page for you. Decorate it to make it yours."}
        </p>
      )}

      {rendering ? (
        <div ref={stageRef} aria-hidden className="pointer-events-none fixed top-0 -left-[20000px]" style={{ width: EXPORT_PAGE_WIDTH }}>
          <ScrapbookPage scrapbook={scrapbook} photos={sources} quality="export" rounded={false} />
        </div>
      ) : null}
    </div>
  );
}
