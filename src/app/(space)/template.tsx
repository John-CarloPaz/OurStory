/** Re-mounts on every navigation inside the space, so each page eases in. */
export default function SpaceTemplate({ children }: { children: React.ReactNode }) {
  return <div className="os-page-enter">{children}</div>;
}
