import type { CSSProperties, ReactNode } from "react";
import {
  PAGE_WIDTH,
  SVG_STICKERS,
  pageHeight,
  type PhotoElement,
  type ScrapElement,
  type Scrapbook,
  type SvgSticker,
  type TextElement,
} from "@/lib/scrapbook/model";
import { SvgStickerArt } from "./stickers";

/**
 * Renders a scrapbook page. Pure and server-renderable.
 *
 * The wrapper is a CSS size container, so `cqw` inside it means "percent of
 * page width". One logical unit (the page is 1000 wide) is 0.1cqw, which is
 * how positions, sizes and even font sizes scale to any screen without JS.
 */

export type PhotoSources = Record<string, { thumb: string | null; full: string | null }>;

const u = (units: number) => `calc(${units} * 0.1cqw)`;

const FONT_FAMILIES: Record<TextElement["font"], string> = {
  hand: "var(--font-caveat), 'Segoe Print', cursive",
  marker: "var(--font-permanent-marker), var(--font-caveat), cursive",
  typewriter: "var(--font-special-elite), 'Courier New', monospace",
  serif: "var(--font-fraunces), Georgia, serif",
  sans: "var(--font-inter), system-ui, sans-serif",
};

export function elementBoxStyle(el: ScrapElement): CSSProperties {
  return {
    position: "absolute",
    left: u(el.x),
    top: u(el.y),
    width: u(el.w),
    transform: `translate(-50%, -50%) rotate(${el.rotation}deg)`,
    zIndex: el.z,
  };
}

function PhotoView({ el, sources }: { el: PhotoElement; sources?: PhotoSources[string] }) {
  // Large photos use the original; small ones the thumbnail.
  const src = (el.w > 560 ? (sources?.full ?? sources?.thumb) : (sources?.thumb ?? sources?.full)) ?? null;
  const image = src ? (
    // eslint-disable-next-line @next/next/no-img-element -- signed private URL
    <img
      src={src}
      alt={el.caption ?? ""}
      draggable={false}
      loading="lazy"
      decoding="async"
      className="block w-full object-cover select-none"
      style={{ aspectRatio: `1 / ${el.frame === "circle" ? 1 : el.aspect}`, borderRadius: el.frame === "circle" ? "50%" : el.frame === "rounded" ? "7%" : undefined }}
    />
  ) : (
    <div
      className="w-full bg-[linear-gradient(135deg,#efe3d3,#e2d0bd)]"
      style={{ aspectRatio: `1 / ${el.frame === "circle" ? 1 : el.aspect}`, borderRadius: el.frame === "circle" ? "50%" : undefined }}
    />
  );
  const caption = el.caption ? (
    <span
      className="absolute inset-x-[5%] truncate text-center text-[#4a3b33]"
      style={{ bottom: "4%", fontFamily: FONT_FAMILIES.hand, fontSize: u(el.w * 0.085), lineHeight: 1.1 }}
    >
      {el.caption}
    </span>
  ) : null;

  switch (el.frame) {
    case "polaroid":
      return (
        <div className="relative bg-[#fffdf8] shadow-[0_1px_2px_rgb(40_25_10/0.15),0_14px_28px_-14px_rgb(40_25_10/0.45)]" style={{ padding: "5% 5% 22%" }}>
          {image}
          {caption}
        </div>
      );
    case "film":
      return (
        <div
          className="relative bg-[#1c1a19] shadow-[0_14px_28px_-14px_rgb(0_0_0/0.6)]"
          style={{
            padding: "9% 3.5%",
            backgroundImage:
              "radial-gradient(circle at center, #f4efe6 0 38%, transparent 42%), radial-gradient(circle at center, #f4efe6 0 38%, transparent 42%)",
            backgroundSize: "7% 6%, 7% 6%",
            backgroundRepeat: "repeat-x, repeat-x",
            backgroundPosition: "0 1.5%, 0 98.5%",
          }}
        >
          {image}
        </div>
      );
    case "stamp":
      return (
        <div
          className="relative bg-[#fffaf0] drop-shadow-[0_8px_10px_rgb(40_25_10/0.3)]"
          style={{
            padding: "7%",
            WebkitMask: "radial-gradient(circle 3.2% at 3.2% 3.2%, transparent 98%, #000) -3.2% -3.2% / 9% 9%",
            mask: "radial-gradient(circle 3.2% at 3.2% 3.2%, transparent 98%, #000) -3.2% -3.2% / 9% 9%",
          }}
        >
          {image}
        </div>
      );
    case "circle":
      return <div className="rounded-full bg-white p-[3.5%] shadow-[0_12px_24px_-12px_rgb(40_25_10/0.45)]">{image}</div>;
    case "rounded":
      return <div className="shadow-[0_12px_24px_-12px_rgb(40_25_10/0.45)]" style={{ borderRadius: "7%" }}>{image}</div>;
    case "plain":
    default:
      return <div className="shadow-[0_10px_22px_-12px_rgb(40_25_10/0.5)]">{image}</div>;
  }
}

function TextView({ el }: { el: TextElement }) {
  const common: CSSProperties = {
    fontFamily: FONT_FAMILIES[el.font],
    fontSize: u(el.size),
    lineHeight: el.font === "hand" ? 1.05 : 1.25,
    color: el.color,
    textAlign: el.align,
    whiteSpace: "pre-wrap",
    overflowWrap: "anywhere",
  };
  const text = el.text || " ";
  switch (el.style) {
    case "sticky":
      return (
        <div
          className="shadow-[0_1px_1px_rgb(0_0_0/0.08),0_18px_24px_-18px_rgb(0_0_0/0.5)]"
          style={{ ...common, background: el.fill, padding: "8% 9%", borderRadius: "2px 2px 22px 2px / 2px 2px 10px 2px" }}
        >
          {text}
        </div>
      );
    case "label":
      return (
        <div
          className="shadow-[0_4px_10px_-4px_rgb(0_0_0/0.4)]"
          style={{ ...common, background: el.fill, padding: "0.35em 0.7em", borderRadius: "0.2em", letterSpacing: "0.08em" }}
        >
          {text}
        </div>
      );
    case "torn":
      return (
        <div
          className="drop-shadow-[0_8px_10px_rgb(40_25_10/0.25)]"
          style={{
            ...common,
            background: el.fill,
            padding: "9% 8%",
            clipPath:
              "polygon(0 4%, 6% 0, 14% 3%, 24% 0, 33% 4%, 45% 1%, 56% 4%, 66% 0, 77% 3%, 88% 0, 100% 4%, 98% 50%, 100% 96%, 90% 100%, 78% 97%, 66% 100%, 54% 96%, 42% 100%, 30% 97%, 18% 100%, 7% 97%, 0 100%, 2% 50%)",
          }}
        >
          {text}
        </div>
      );
    case "plain":
    default:
      return <div style={common}>{text}</div>;
  }
}

export function ElementView({ el, photos }: { el: ScrapElement; photos: PhotoSources }) {
  switch (el.type) {
    case "photo":
      return <PhotoView el={el} sources={photos[el.photoId]} />;
    case "text":
      return <TextView el={el} />;
    case "tape":
      return (
        <span
          data-pattern={el.pattern}
          className="os-tape block w-full"
          style={{ "--tape": el.color, height: u(el.w * 0.24), width: "100%", opacity: 0.88 } as CSSProperties}
        />
      );
    case "sticker":
      return (SVG_STICKERS as readonly string[]).includes(el.sticker) ? (
        <div className="os-sticker">
          <SvgStickerArt id={el.sticker as SvgSticker} />
        </div>
      ) : (
        <div className="os-sticker os-emoji text-center select-none" style={{ fontSize: u(el.w * 0.82) }}>
          {el.sticker}
        </div>
      );
  }
}

export function ScrapbookPage({
  scrapbook,
  photos,
  className = "",
  renderElement,
  children,
  animate = false,
}: {
  scrapbook: Scrapbook;
  photos: PhotoSources;
  className?: string;
  /** Lets the editor wrap each element with selection and drag handles. */
  renderElement?: (el: ScrapElement, content: ReactNode) => ReactNode;
  children?: ReactNode;
  animate?: boolean;
}) {
  const height = pageHeight(scrapbook);
  const ordered = [...scrapbook.elements].sort((a, b) => a.z - b.z);
  return (
    <div className={`[container-type:inline-size] ${className}`}>
      <div
        data-paper={scrapbook.page.paper}
        className="os-paper relative w-full overflow-hidden rounded-[1.2cqw]"
        style={{ aspectRatio: `${PAGE_WIDTH} / ${height}`, "--paper": scrapbook.page.color } as CSSProperties}
      >
        {ordered.map((el, index) => {
          const content = <ElementView el={el} photos={photos} />;
          if (renderElement) return <div key={el.id}>{renderElement(el, content)}</div>;
          return (
            <div key={el.id} style={elementBoxStyle(el)}>
              {animate ? (
                // The pop animates an inner box so it never fights the positioning transform.
                <div
                  style={
                    {
                      animation: `os-pop 0.55s ${Math.min(index, 20) * 50}ms cubic-bezier(0.34,1.56,0.64,1) both`,
                      "--pop-rotate": "-8deg",
                    } as CSSProperties
                  }
                >
                  {content}
                </div>
              ) : (
                content
              )}
            </div>
          );
        })}
        {children}
      </div>
    </div>
  );
}
