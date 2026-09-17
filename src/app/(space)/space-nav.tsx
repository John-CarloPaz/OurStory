"use client";

import { MoreHorizontal, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { MOBILE_PRIMARY, MORE_ITEMS, NAV_ITEMS, isActive } from "./nav-items";

/** Desktop: pill navigation with a highlight that glides to the active section. */
export function DesktopNav() {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const list = listRef.current;
    const indicator = indicatorRef.current;
    if (!list || !indicator) return;
    const place = () => {
      const active = list.querySelector<HTMLElement>("[aria-current='page']");
      if (!active) {
        indicator.style.opacity = "0";
        return;
      }
      // Measure against the list itself (each link sits in its own positioned <li>).
      const offset = active.getBoundingClientRect().left - list.getBoundingClientRect().left;
      indicator.style.opacity = "1";
      indicator.style.width = `${active.offsetWidth}px`;
      indicator.style.transform = `translateX(${offset}px)`;
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(list);
    return () => observer.disconnect();
  }, [pathname]);

  return (
    <nav aria-label="Sections" className="hidden lg:block">
      <ul ref={listRef} className="relative flex items-center gap-0.5">
        <span
          ref={indicatorRef}
          aria-hidden
          className="absolute top-0 left-0 h-full rounded-full bg-[linear-gradient(135deg,var(--os-primary),color-mix(in_srgb,var(--os-primary)_68%,#ff9f7a))] opacity-0 shadow-[0_8px_20px_-10px_var(--os-primary)] transition-[transform,width,opacity] duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)]"
        />
        {NAV_ITEMS.map(({ href, label }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="relative">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`relative block rounded-full px-3.5 py-2 text-sm font-medium transition-colors duration-300 ${
                  active ? "text-on-accent" : "text-muted hover:text-ink"
                }`}
              >
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

/** Phones and tablets: a floating glass tab bar with a "More" sheet. */
export function MobileTabBar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const primary = NAV_ITEMS.filter((item) => MOBILE_PRIMARY.includes(item.href));
  const moreActive = MORE_ITEMS.some((item) => isActive(pathname, item.href));

  return (
    <>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="More sections">
          <button type="button" aria-label="Close" className="absolute inset-0 bg-black/25" onClick={() => setOpen(false)} />
          <div className="os-glass os-frost absolute inset-x-3 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] animate-[os-sheet-up_0.35s_cubic-bezier(0.2,0.7,0.2,1)_backwards] rounded-[1.75rem] p-3 shadow-2xl">
            <ul className="grid grid-cols-3 gap-2">
              {MORE_ITEMS.map(({ href, label, icon: Icon }) => {
                const active = isActive(pathname, href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 text-xs font-medium transition ${
                        active ? "bg-accent text-on-accent" : "text-ink hover:bg-accent-soft"
                      }`}
                    >
                      <Icon className="size-5" aria-hidden />
                      {label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      ) : null}

      <nav
        aria-label="Sections"
        className="fixed inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-50 lg:hidden"
      >
        <ul className="os-glass os-frost mx-auto flex max-w-md items-stretch justify-between rounded-full p-1.5 shadow-[0_18px_40px_-18px_rgb(0_0_0/0.45)]">
          {primary.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href} className="flex-1">
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex h-12 flex-col items-center justify-center gap-0.5 rounded-full text-[0.65rem] font-medium transition-all duration-300 ${
                    active ? "bg-accent text-on-accent shadow-md" : "text-muted"
                  }`}
                >
                  <Icon className={`size-5 transition-transform duration-300 ${active ? "-translate-y-px scale-110" : ""}`} aria-hidden />
                  {label}
                </Link>
              </li>
            );
          })}
          <li className="flex-1">
            <button
              type="button"
              onClick={() => setOpen((v) => !v)}
              aria-expanded={open}
              className={`flex h-12 w-full flex-col items-center justify-center gap-0.5 rounded-full text-[0.65rem] font-medium transition ${
                moreActive || open ? "bg-accent-soft text-accent" : "text-muted"
              }`}
            >
              {open ? <X className="size-5" aria-hidden /> : <MoreHorizontal className="size-5" aria-hidden />}
              More
            </button>
          </li>
        </ul>
      </nav>
    </>
  );
}
