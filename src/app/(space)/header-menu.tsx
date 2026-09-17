"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";

/**
 * A <details> dropdown that behaves like a menu: it closes when you click or
 * tap outside it, press Escape, pick a link or submit a form inside it, or
 * navigate to another page.
 */
export function HeaderMenu({ summary, children, className = "" }: { summary: ReactNode; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    const details = ref.current;
    if (!details) return;
    const onPointerDown = (event: PointerEvent) => {
      if (details.open && !details.contains(event.target as Node)) details.open = false;
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || !details.open) return;
      details.open = false;
      details.querySelector("summary")?.focus();
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  // The header stays mounted across pages, so close the menu after navigating.
  useEffect(() => {
    if (ref.current) ref.current.open = false;
  }, [pathname]);

  const close = () => {
    if (ref.current) ref.current.open = false;
  };

  return (
    <details ref={ref} className={`group relative ${className}`}>
      {summary}
      <div
        onClick={(event) => {
          if ((event.target as Element).closest("a")) close();
        }}
        onSubmit={close}
      >
        {children}
      </div>
    </details>
  );
}
