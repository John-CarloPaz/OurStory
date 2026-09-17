"use client";

import { Paintbrush, Sparkles } from "lucide-react";
import { useState } from "react";
import type { Scrapbook } from "@/lib/scrapbook/model";
import { ScrapbookEditor, type EditorPhoto } from "./scrapbook-editor";
import { ScrapbookPage } from "./scrapbook-page";

/** An entry's scrapbook page: view mode with a "Decorate" button that opens the editor. */
export function ScrapbookBoard({
  journalId,
  scrapbook,
  generated,
  saved,
  updatedAt,
  updatedByName,
  photos,
}: {
  journalId: string;
  scrapbook: Scrapbook;
  generated: Scrapbook;
  saved: boolean;
  updatedAt: string | null;
  updatedByName: string | null;
  photos: EditorPhoto[];
}) {
  const [editing, setEditing] = useState(false);
  const sources = Object.fromEntries(photos.map((p) => [p.id, { thumb: p.thumb, full: p.full }]));

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

  return (
    <div className="relative mx-auto max-w-[44rem]">
      <div className="relative">
        <ScrapbookPage scrapbook={scrapbook} photos={sources} animate />
        <button
          type="button"
          onClick={() => setEditing(true)}
          className="group absolute top-3 right-3 z-[10000] inline-flex h-11 items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--os-primary),color-mix(in_srgb,var(--os-primary)_68%,#ff9f7a))] px-4 text-sm font-medium text-on-accent shadow-[0_12px_30px_-10px_var(--os-primary)] transition hover:-translate-y-0.5 active:scale-95"
        >
          <Paintbrush className="size-4 transition-transform group-hover:-rotate-12" aria-hidden />
          Decorate
        </button>
      </div>
      <p className="mt-3 flex items-center justify-center gap-1.5 text-center text-sm text-muted">
        <Sparkles className="size-3.5 text-accent" aria-hidden />
        {saved
          ? updatedByName
            ? `Last decorated by ${updatedByName}`
            : "Decorated together"
          : "We arranged this page for you. Decorate it to make it yours."}
      </p>
    </div>
  );
}
