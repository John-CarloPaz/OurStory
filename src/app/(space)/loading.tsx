/**
 * Shown the moment a section link is tapped, while the page loads on the server.
 * It fades in after a short delay, so quick navigations don't flash it.
 */
export default function SpaceLoading() {
  const bar = "rounded-full bg-[color-mix(in_srgb,var(--os-ink)_9%,transparent)]";

  return (
    <div role="status" data-space-loading className="animate-[os-page-in_0.3s_var(--os-ease-out)_0.15s_backwards]">
      <span className="sr-only">Loading…</span>
      <div aria-hidden className="animate-pulse">
        <div className={`${bar} h-3 w-24`} />
        <div className={`${bar} mt-4 h-10 w-72 max-w-full sm:h-12`} />
        <div className={`${bar} mt-4 h-4 w-96 max-w-full`} />

        <div className="mt-11 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="os-card p-5">
              <div className="aspect-[4/3] rounded-2xl bg-[color-mix(in_srgb,var(--os-ink)_6%,transparent)]" />
              <div className={`${bar} mt-5 h-4 w-3/4`} />
              <div className={`${bar} mt-3 h-3 w-1/2`} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
