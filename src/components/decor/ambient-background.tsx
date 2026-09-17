/** Slowly drifting color fields behind everything. Pure CSS; paused under reduced motion. */
export function AmbientBackground() {
  return (
    <div className="os-ambient" aria-hidden>
      <span className="os-ambient-blob" />
      <span className="os-ambient-blob" />
      <span className="os-ambient-blob" />
    </div>
  );
}

/** Subtle film grain over the background (under content). */
export function GrainLayer() {
  return <div className="os-grain-layer" aria-hidden />;
}
