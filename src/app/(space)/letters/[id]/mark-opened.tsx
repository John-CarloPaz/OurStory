"use client";

import { useEffect } from "react";
import { markLetterOpened } from "@/app/actions/content";

/** Records the first time the recipient actually views an unlocked letter (not on prefetch). */
export function MarkOpened({ letterId }: { letterId: string }) {
  useEffect(() => {
    void markLetterOpened(letterId);
  }, [letterId]);
  return null;
}
