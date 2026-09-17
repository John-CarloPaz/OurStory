"use client";

import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDownToLine,
  ArrowUpToLine,
  Copy,
  Image as ImageIcon,
  Loader2,
  Maximize2,
  Palette,
  RotateCw,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Undo2,
  Wand2,
  X,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";
import { saveScrapbook } from "@/app/actions/scrapbook";
import { ImageUpload } from "@/components/image-upload";
import {
  EMOJI_STICKERS,
  PAGE_SIZES,
  PAPERS,
  PAPER_DEFAULT_COLORS,
  PAPER_LABELS,
  PHOTO_FRAMES,
  SVG_STICKERS,
  SWATCHES,
  TAPE_PATTERNS,
  TEXT_FONTS,
  TEXT_STYLES,
  newElementId,
  pageHeight,
  photoAspect,
  type PageSize,
  type ScrapElement,
  type Scrapbook,
  type SvgSticker,
  type TextElement,
} from "@/lib/scrapbook/model";
import { ScrapbookPage, elementBoxStyle, type PhotoSources } from "./scrapbook-page";
import { SvgStickerArt } from "./stickers";

export type EditorPhoto = { id: string; width: number | null; height: number | null; thumb: string | null; full: string | null };

type Panel = "photos" | "stickers" | "text" | "tape" | "page" | "selected";
type Gesture = {
  kind: "move" | "rotate" | "scale";
  id: string;
  pointerX: number;
  pointerY: number;
  start: ScrapElement;
  rect: DOMRect;
  startDistance: number;
  before: Scrapbook;
  moved: boolean;
};

const TABS: { id: Exclude<Panel, "selected">; label: string; icon: LucideIcon }[] = [
  { id: "photos", label: "Photos", icon: ImageIcon },
  { id: "stickers", label: "Stickers", icon: Sparkles },
  { id: "text", label: "Words", icon: Type },
  { id: "tape", label: "Tape", icon: Shapes },
  { id: "page", label: "Paper", icon: Palette },
];

const FRAME_LABELS: Record<(typeof PHOTO_FRAMES)[number], string> = {
  polaroid: "Polaroid",
  plain: "Plain",
  rounded: "Rounded",
  circle: "Circle",
  film: "Film",
  stamp: "Stamp",
};
const FONT_LABELS: Record<TextElement["font"], string> = { hand: "Handwritten", marker: "Marker", typewriter: "Typewriter", serif: "Serif", sans: "Clean" };
const STYLE_LABELS: Record<TextElement["style"], string> = { plain: "Ink only", sticky: "Sticky note", label: "Label", torn: "Torn paper" };

const TAPE_OPTIONS = TAPE_PATTERNS.flatMap((pattern, i) => [SWATCHES[i % 6], SWATCHES[(i + 3) % 6]].map((color) => ({ pattern, color })));

function SwatchRow({ label, value, onPick }: { label: string; value: string; onPick: (color: string) => void }) {
  return (
    <div>
      <p className="mb-2 text-xs font-medium text-muted">{label}</p>
      <div className="flex flex-wrap items-center gap-1.5">
        {SWATCHES.map((color) => (
          <button
            key={color}
            type="button"
            aria-label={`${label} ${color}`}
            onClick={() => onPick(color)}
            className={`size-7 rounded-full border shadow-sm transition hover:scale-110 ${value.toLowerCase() === color ? "ring-2 ring-accent ring-offset-2 ring-offset-[var(--os-bg)]" : "border-black/10"}`}
            style={{ background: color }}
          />
        ))}
        <label className="relative size-7 cursor-pointer overflow-hidden rounded-full border border-black/10 bg-[conic-gradient(red,yellow,lime,cyan,blue,magenta,red)]" title="Custom color">
          <input type="color" value={value} onChange={(e) => onPick(e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" aria-label={`${label} custom`} />
        </label>
      </div>
    </div>
  );
}

function Slider({ label, value, min, max, onChange }: { label: string; value: number; min: number; max: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-xs font-medium text-muted">
      <span className="flex justify-between">
        {label}
        <span className="tabular-nums">{Math.round(value)}</span>
      </span>
      <input type="range" min={min} max={max} value={value} onChange={(e) => onChange(Number(e.target.value))} className="mt-1 w-full accent-[var(--os-primary)]" />
    </label>
  );
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const round = (value: number) => Math.round(value * 10) / 10;

export function ScrapbookEditor({
  journalId,
  initial,
  generated,
  baseUpdatedAt,
  photos,
  onClose,
}: {
  journalId: string;
  initial: Scrapbook;
  generated: Scrapbook;
  baseUpdatedAt: string | null;
  photos: EditorPhoto[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [doc, setDoc] = useState<Scrapbook>(initial);
  const [history, setHistory] = useState<Scrapbook[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [panel, setPanel] = useState<Panel>("stickers");
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);
  const gesture = useRef<Gesture | null>(null);

  const photoSources: PhotoSources = useMemo(
    () => Object.fromEntries(photos.map((p) => [p.id, { thumb: p.thumb, full: p.full }])),
    [photos],
  );
  const selected = doc.elements.find((el) => el.id === selectedId) ?? null;
  const height = pageHeight(doc);

  // Doc changes ------------------------------------------------------------------

  const commit = useCallback((next: Scrapbook, previous: Scrapbook) => {
    setHistory((h) => [...h.slice(-49), previous]);
    setDoc(next);
    setDirty(true);
  }, []);

  // Rapid edits to the same thing (dragging a slider, typing) become one undo step.
  const lastChange = useRef<{ key: string; at: number } | null>(null);

  const change = useCallback(
    (recipe: (current: Scrapbook) => Scrapbook, coalesceKey?: string) => {
      const next = recipe(doc);
      if (next === doc) return;
      const now = Date.now();
      const coalesce = coalesceKey && lastChange.current?.key === coalesceKey && now - lastChange.current.at < 800;
      lastChange.current = coalesceKey ? { key: coalesceKey, at: now } : null;
      if (!coalesce) setHistory((h) => [...h.slice(-49), doc]);
      setDoc(next);
      setDirty(true);
    },
    [doc],
  );

  const updateElement = useCallback(
    (id: string, patch: Partial<ScrapElement>) =>
      change(
        (current) => ({
          ...current,
          elements: current.elements.map((el) => (el.id === id ? ({ ...el, ...patch } as ScrapElement) : el)),
        }),
        `${id}:${Object.keys(patch).sort().join(",")}`,
      ),
    [change],
  );

  const addElement = useCallback(
    (element: Omit<ScrapElement, "id" | "x" | "y" | "z" | "rotation"> & Partial<Pick<ScrapElement, "rotation">>) => {
      const id = newElementId();
      change((current) => {
        const topZ = current.elements.reduce((max, el) => Math.max(max, el.z), 0);
        const pageH = pageHeight(current);
        // Drop new items near the middle of what's on screen, with a little scatter.
        const rect = pageRef.current?.getBoundingClientRect();
        let y = pageH / 2;
        if (rect) {
          const scale = rect.width / 1000;
          const visibleTop = Math.max(0, -rect.top / scale);
          const visibleBottom = Math.min(pageH, (window.innerHeight * 0.55 - rect.top) / scale);
          if (visibleBottom > visibleTop) y = (visibleTop + visibleBottom) / 2;
        }
        const created = {
          rotation: Math.round((Math.random() * 2 - 1) * 6),
          ...element,
          id,
          x: 500 + Math.round((Math.random() * 2 - 1) * 60),
          y: clamp(y + Math.round((Math.random() * 2 - 1) * 60), 80, pageH - 80),
          z: topZ + 1,
        } as ScrapElement;
        return { ...current, elements: [...current.elements, created] };
      });
      setSelectedId(id);
      setPanel("selected");
    },
    [change],
  );

  const removeSelected = useCallback(() => {
    if (!selectedId) return;
    change((current) => ({ ...current, elements: current.elements.filter((el) => el.id !== selectedId) }));
    setSelectedId(null);
    setPanel("stickers");
  }, [change, selectedId]);

  const duplicateSelected = useCallback(() => {
    if (!selected) return;
    const id = newElementId();
    change((current) => {
      const topZ = current.elements.reduce((max, el) => Math.max(max, el.z), 0);
      return { ...current, elements: [...current.elements, { ...selected, id, x: selected.x + 30, y: selected.y + 30, z: topZ + 1 }] };
    });
    setSelectedId(id);
  }, [change, selected]);

  const reorderSelected = useCallback(
    (direction: "front" | "back") => {
      if (!selected) return;
      change((current) => {
        const zs = current.elements.map((el) => el.z);
        const z = direction === "front" ? Math.max(...zs) + 1 : Math.min(...zs) - 1;
        const elements = current.elements.map((el) => (el.id === selected.id ? { ...el, z } : el));
        // Keep z values small and non-negative.
        const order = [...elements].sort((a, b) => a.z - b.z).map((el) => el.id);
        return { ...current, elements: elements.map((el) => ({ ...el, z: order.indexOf(el.id) + 1 })) };
      });
    },
    [change, selected],
  );

  const undo = useCallback(() => {
    if (!history.length) return;
    setDoc(history[history.length - 1]);
    setHistory(history.slice(0, -1));
    setDirty(true);
    lastChange.current = null;
  }, [history]);

  // Gestures ---------------------------------------------------------------------

  function startGesture(event: ReactPointerEvent, el: ScrapElement, kind: Gesture["kind"]) {
    if (event.button !== 0) return;
    event.stopPropagation();
    event.preventDefault();
    const rect = pageRef.current?.getBoundingClientRect();
    if (!rect) return;
    (event.currentTarget as Element).setPointerCapture(event.pointerId);
    const scale = rect.width / 1000;
    const centerX = rect.left + el.x * scale;
    const centerY = rect.top + el.y * scale;
    gesture.current = {
      kind,
      id: el.id,
      pointerX: event.clientX,
      pointerY: event.clientY,
      start: el,
      rect,
      startDistance: Math.max(8, Math.hypot(event.clientX - centerX, event.clientY - centerY)),
      before: doc,
      moved: false,
    };
    setSelectedId(el.id);
    setPanel("selected");
  }

  function moveGesture(event: ReactPointerEvent) {
    const g = gesture.current;
    if (!g) return;
    const scale = g.rect.width / 1000;
    const centerX = g.rect.left + g.start.x * scale;
    const centerY = g.rect.top + g.start.y * scale;
    let patch: Partial<ScrapElement>;
    if (g.kind === "move") {
      patch = {
        x: round(clamp(g.start.x + (event.clientX - g.pointerX) / scale, -100, 1100)),
        y: round(clamp(g.start.y + (event.clientY - g.pointerY) / scale, -100, height + 100)),
      };
    } else if (g.kind === "rotate") {
      let angle = (Math.atan2(event.clientY - centerY, event.clientX - centerX) * 180) / Math.PI + 90;
      if (angle > 180) angle -= 360;
      const snapped = event.shiftKey ? Math.round(angle / 15) * 15 : Math.abs(angle) < 3 ? 0 : angle;
      patch = { rotation: round(snapped) };
    } else {
      const distance = Math.hypot(event.clientX - centerX, event.clientY - centerY);
      patch = { w: round(clamp(g.start.w * (distance / g.startDistance), 40, 1000)) };
    }
    g.moved = true;
    setDoc((current) => ({
      ...current,
      elements: current.elements.map((el) => (el.id === g.id ? ({ ...el, ...patch } as ScrapElement) : el)),
    }));
  }

  function endGesture() {
    const g = gesture.current;
    gesture.current = null;
    if (g?.moved) {
      setHistory((h) => [...h.slice(-49), g.before]);
      setDirty(true);
    }
  }

  // Keyboard, unsaved changes -------------------------------------------------------

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
        event.preventDefault();
        undo();
        return;
      }
      if (!selected) return;
      const step = event.shiftKey ? 20 : 4;
      const moves: Record<string, Partial<ScrapElement>> = {
        ArrowLeft: { x: selected.x - step },
        ArrowRight: { x: selected.x + step },
        ArrowUp: { y: selected.y - step },
        ArrowDown: { y: selected.y + step },
        "[": { rotation: clamp(selected.rotation - 5, -180, 180) },
        "]": { rotation: clamp(selected.rotation + 5, -180, 180) },
        "-": { w: clamp(selected.w * 0.93, 40, 1000) },
        "=": { w: clamp(selected.w * 1.07, 40, 1000) },
        "+": { w: clamp(selected.w * 1.07, 40, 1000) },
      };
      if (moves[event.key]) {
        event.preventDefault();
        updateElement(selected.id, moves[event.key]);
      } else if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        removeSelected();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
        event.preventDefault();
        duplicateSelected();
      } else if (event.key === "Escape") {
        setSelectedId(null);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, undo, updateElement, removeSelected, duplicateSelected]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setSaving(true);
    setError(null);
    const result = await saveScrapbook({ journalId, scrapbook: doc, baseUpdatedAt });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setDirty(false);
    router.refresh();
    onClose();
  }

  function cancel() {
    if (dirty && !window.confirm("Discard your changes to this page?")) return;
    onClose();
  }

  // Render ---------------------------------------------------------------------------

  const chip = (active: boolean) =>
    `rounded-full border px-3 py-1.5 text-xs font-medium transition ${
      active ? "border-accent bg-accent text-on-accent" : "border-line bg-[var(--os-glass)] text-ink hover:border-accent/60"
    }`;
  const iconButton = "grid size-9 place-items-center rounded-full border border-line bg-[var(--os-glass)] text-ink transition hover:border-accent/60 disabled:opacity-40";
  const tabButton = "flex min-w-0 flex-col items-center gap-0.5 rounded-2xl px-0.5 py-2 text-[0.65rem] font-medium transition";

  let panelBody: React.ReactNode = null;
  if (panel === "selected" && selected) {
    panelBody = (
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <button type="button" className={iconButton} onClick={() => reorderSelected("front")} title="Bring to front" aria-label="Bring to front">
            <ArrowUpToLine className="size-4" />
          </button>
          <button type="button" className={iconButton} onClick={() => reorderSelected("back")} title="Send to back" aria-label="Send to back">
            <ArrowDownToLine className="size-4" />
          </button>
          <button type="button" className={iconButton} onClick={duplicateSelected} title="Duplicate" aria-label="Duplicate">
            <Copy className="size-4" />
          </button>
          <button type="button" className={`${iconButton} text-danger`} onClick={removeSelected} title="Remove" aria-label="Remove">
            <Trash2 className="size-4" />
          </button>
          <button type="button" className={`${iconButton} ml-auto`} onClick={() => { setSelectedId(null); setPanel("stickers"); }} aria-label="Done with this item">
            <X className="size-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Slider label="Size" value={selected.w} min={40} max={1000} onChange={(w) => updateElement(selected.id, { w })} />
          <Slider label="Tilt" value={selected.rotation} min={-180} max={180} onChange={(rotation) => updateElement(selected.id, { rotation })} />
        </div>

        {selected.type === "photo" ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {PHOTO_FRAMES.map((frame) => (
                <button key={frame} type="button" className={chip(selected.frame === frame)} onClick={() => updateElement(selected.id, { frame })}>
                  {FRAME_LABELS[frame]}
                </button>
              ))}
            </div>
            <label className="block text-xs font-medium text-muted">
              Caption
              <input
                value={selected.caption ?? ""}
                maxLength={80}
                onChange={(e) => updateElement(selected.id, { caption: e.target.value || undefined })}
                placeholder={selected.frame === "polaroid" ? "Written under the photo" : "Shown on polaroids"}
                className="mt-1 h-10 w-full rounded-xl border border-line bg-field px-3 text-sm text-ink"
              />
            </label>
          </>
        ) : null}

        {selected.type === "text" ? (
          <>
            <textarea
              value={selected.text}
              maxLength={600}
              rows={3}
              onChange={(e) => updateElement(selected.id, { text: e.target.value })}
              className="w-full rounded-xl border border-line bg-field p-3 text-sm text-ink"
              aria-label="Text"
            />
            <div className="flex flex-wrap gap-1.5">
              {TEXT_FONTS.map((font) => (
                <button key={font} type="button" className={chip(selected.font === font)} onClick={() => updateElement(selected.id, { font })}>
                  {FONT_LABELS[font]}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {TEXT_STYLES.map((style) => (
                <button key={style} type="button" className={chip(selected.style === style)} onClick={() => updateElement(selected.id, { style })}>
                  {STYLE_LABELS[style]}
                </button>
              ))}
              <span className="ml-auto flex gap-1">
                {(["left", "center", "right"] as const).map((align) => {
                  const Icon = align === "left" ? AlignLeft : align === "center" ? AlignCenter : AlignRight;
                  return (
                    <button key={align} type="button" aria-label={`Align ${align}`} className={`${iconButton} size-8 ${selected.align === align ? "border-accent text-accent" : ""}`} onClick={() => updateElement(selected.id, { align })}>
                      <Icon className="size-3.5" />
                    </button>
                  );
                })}
              </span>
            </div>
            <Slider label="Text size" value={selected.size} min={12} max={200} onChange={(size) => updateElement(selected.id, { size })} />
            <SwatchRow label="Ink" value={selected.color} onPick={(color) => updateElement(selected.id, { color })} />
            {selected.style !== "plain" ? <SwatchRow label="Paper" value={selected.fill} onPick={(fill) => updateElement(selected.id, { fill })} /> : null}
          </>
        ) : null}

        {selected.type === "tape" ? (
          <>
            <div className="flex flex-wrap gap-1.5">
              {TAPE_PATTERNS.map((pattern) => (
                <button key={pattern} type="button" className={chip(selected.pattern === pattern)} onClick={() => updateElement(selected.id, { pattern })}>
                  {pattern[0].toUpperCase() + pattern.slice(1)}
                </button>
              ))}
            </div>
            <SwatchRow label="Tape color" value={selected.color} onPick={(color) => updateElement(selected.id, { color })} />
          </>
        ) : null}
      </div>
    );
  } else if (panel === "photos") {
    panelBody = (
      <div className="space-y-3">
        {photos.length ? (
          <div className="grid grid-cols-4 gap-2 lg:grid-cols-3">
            {photos.map((photo) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => addElement({ type: "photo", photoId: photo.id, frame: "polaroid", aspect: photoAspect(photo), w: 400 } as ScrapElement)}
                className="group relative overflow-hidden rounded-xl bg-accent-soft"
                aria-label="Add this photo to the page"
              >
                {photo.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element -- signed private URL
                  <img src={photo.thumb} alt="" className="aspect-square w-full object-cover transition group-hover:scale-105" />
                ) : (
                  <span className="block aspect-square" />
                )}
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">Upload photos to this entry, then place them on the page.</p>
        )}
        <ImageUpload target={{ kind: "journal_photo", journalId }} multiple label="Upload photos" />
      </div>
    );
  } else if (panel === "stickers") {
    panelBody = (
      <div className="space-y-3">
        <div className="grid grid-cols-4 gap-2">
          {SVG_STICKERS.map((id) => (
            <button key={id} type="button" onClick={() => addElement({ type: "sticker", sticker: id, w: 150 } as ScrapElement)} className="grid aspect-square place-items-center rounded-xl p-2 transition hover:scale-110 hover:bg-accent-soft" aria-label={`Add ${id} sticker`}>
              <span className="os-sticker block w-full">
                <SvgStickerArt id={id as SvgSticker} />
              </span>
            </button>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-1">
          {EMOJI_STICKERS.map((emoji) => (
            <button key={emoji} type="button" onClick={() => addElement({ type: "sticker", sticker: emoji, w: 120 } as ScrapElement)} className="os-emoji grid aspect-square place-items-center rounded-lg text-2xl transition hover:scale-125 hover:bg-accent-soft" aria-label={`Add ${emoji} sticker`}>
              {emoji}
            </button>
          ))}
        </div>
      </div>
    );
  } else if (panel === "text") {
    const presets: { label: string; preview: CSSProperties; element: Partial<TextElement> }[] = [
      { label: "Handwritten", preview: { fontFamily: "var(--font-caveat)", fontSize: 22 }, element: { font: "hand", style: "plain", size: 64, color: "#3b2f2a", fill: "#fff0a0", w: 520, text: "our little moment" } },
      { label: "Sticky note", preview: { fontFamily: "var(--font-caveat)", fontSize: 18, background: "#fff0a0", padding: "4px 8px" }, element: { font: "hand", style: "sticky", size: 38, color: "#3b2f2a", fill: "#fff0a0", w: 360, text: "Remember this ♡" } },
      { label: "Label", preview: { fontFamily: "var(--font-special-elite)", fontSize: 13, background: "#3b2f2a", color: "#fff", padding: "3px 8px" }, element: { font: "typewriter", style: "label", size: 30, color: "#ffffff", fill: "#3b2f2a", w: 420, text: "SEPTEMBER 14" } },
      { label: "Torn paper", preview: { fontFamily: "var(--font-fraunces)", fontSize: 16, background: "#ffffff", padding: "4px 8px" }, element: { font: "serif", style: "torn", size: 34, color: "#3b2f2a", fill: "#ffffff", w: 440, text: "The best day." } },
      { label: "Marker", preview: { fontFamily: "var(--font-permanent-marker)", fontSize: 18, color: "#b64f6f" }, element: { font: "marker", style: "plain", size: 56, color: "#b64f6f", fill: "#fff0a0", w: 460, text: "us!" } },
    ];
    panelBody = (
      <div className="grid grid-cols-2 gap-2">
        {presets.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => addElement({ type: "text", align: "center", ...preset.element } as ScrapElement)}
            className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-[var(--os-glass)] p-2 transition hover:-translate-y-0.5 hover:border-accent/60"
          >
            <span className="max-w-full truncate" style={{ color: "#3b2f2a", ...preset.preview }}>
              {preset.element.text}
            </span>
            <span className="text-[0.65rem] text-muted">{preset.label}</span>
          </button>
        ))}
      </div>
    );
  } else if (panel === "tape") {
    panelBody = (
      <div className="grid grid-cols-3 gap-3">
        {TAPE_OPTIONS.map(({ pattern, color }) => (
          <button key={`${pattern}-${color}`} type="button" onClick={() => addElement({ type: "tape", pattern, color, w: 220, rotation: -8 } as ScrapElement)} className="grid h-12 place-items-center rounded-xl transition hover:scale-105 hover:bg-accent-soft" aria-label={`Add ${pattern} tape`}>
            <span data-pattern={pattern} className="os-tape h-5 w-20" style={{ "--tape": color } as CSSProperties} />
          </button>
        ))}
      </div>
    );
  } else if (panel === "page") {
    panelBody = (
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {PAPERS.map((paper) => (
            <button
              key={paper}
              type="button"
              onClick={() => change((current) => ({ ...current, page: { ...current.page, paper, color: PAPER_DEFAULT_COLORS[paper] } }))}
              className={`overflow-hidden rounded-xl border text-[0.65rem] font-medium transition ${doc.page.paper === paper ? "border-accent ring-2 ring-accent/30" : "border-line"}`}
            >
              <span className="block [container-type:inline-size]">
                <span data-paper={paper} className="os-paper block h-12 shadow-none" style={{ "--paper": PAPER_DEFAULT_COLORS[paper] } as CSSProperties} />
              </span>
              <span className="block bg-[var(--os-glass)] py-1 text-ink">{PAPER_LABELS[paper]}</span>
            </button>
          ))}
        </div>
        <SwatchRow label="Paper color" value={doc.page.color} onPick={(color) => change((current) => ({ ...current, page: { ...current.page, color } }))} />
        <div>
          <p className="mb-2 text-xs font-medium text-muted">Page shape</p>
          <div className="flex gap-1.5">
            {(Object.keys(PAGE_SIZES) as PageSize[]).map((size) => (
              <button key={size} type="button" className={chip(doc.page.size === size)} onClick={() => change((current) => ({ ...current, page: { ...current.page, size } }))}>
                {size === "portrait" ? "Portrait" : size === "square" ? "Square" : "Tall"}
              </button>
            ))}
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            if (window.confirm("Replace this page with a fresh automatic layout?")) {
              commit(generated, doc);
              setSelectedId(null);
            }
          }}
          className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
        >
          <Wand2 className="size-4" aria-hidden /> Start over with an automatic layout
        </button>
      </div>
    );
  }

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="space-y-3">
        <div className="os-glass os-frost sticky top-20 z-30 flex items-center gap-2 rounded-full p-1.5 shadow-lg">
          <button type="button" onClick={cancel} className="rounded-full px-3 py-2 text-sm text-muted hover:text-ink">
            Cancel
          </button>
          <button type="button" onClick={undo} disabled={!history.length} className={`${iconButton} border-transparent bg-transparent`} aria-label="Undo">
            <Undo2 className="size-4" />
          </button>
          <span className="hidden flex-1 text-center text-xs text-muted sm:block">
            {dirty ? "Unsaved changes" : "Drag, turn ↻ and resize ⤡ anything on the page"}
          </span>
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="ml-auto inline-flex h-10 items-center gap-2 rounded-full bg-[linear-gradient(135deg,var(--os-primary),color-mix(in_srgb,var(--os-primary)_68%,#ff9f7a))] px-5 text-sm font-medium text-on-accent shadow-md transition active:scale-95 disabled:opacity-60"
          >
            {saving ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {saving ? "Saving…" : "Save page"}
          </button>
        </div>
        {error ? (
          <p role="alert" className="os-pop rounded-2xl bg-danger/10 px-4 py-3 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <div className="mx-auto max-w-[44rem] pb-[46vh] lg:pb-0" onPointerDown={() => setSelectedId(null)}>
          <ScrapbookPage
            scrapbook={doc}
            photos={photoSources}
            className="touch-pan-y"
            renderElement={(el, content) => {
              const isSelected = el.id === selectedId;
              return (
                <div
                  style={{ ...elementBoxStyle(el), zIndex: isSelected ? 9999 : el.z, touchAction: "none" }}
                  className={`cursor-grab select-none active:cursor-grabbing ${isSelected ? "outline-2 outline-offset-4 outline-accent outline-dashed" : "hover:outline-1 hover:outline-offset-4 hover:outline-accent/50 hover:outline-dashed"}`}
                  onPointerDown={(e) => startGesture(e, el, "move")}
                  onPointerMove={moveGesture}
                  onPointerUp={endGesture}
                  onPointerCancel={endGesture}
                  onDoubleClick={() => setPanel("selected")}
                >
                  {content}
                  {isSelected ? (
                    <>
                      <span aria-hidden className="pointer-events-none absolute -top-9 left-1/2 h-9 w-px bg-accent" />
                      <button
                        type="button"
                        aria-label="Rotate"
                        className="absolute -top-12 left-1/2 grid size-8 -translate-x-1/2 cursor-alias place-items-center rounded-full border-2 border-white bg-accent text-on-accent shadow-lg"
                        style={{ touchAction: "none" }}
                        onPointerDown={(e) => startGesture(e, el, "rotate")}
                        onPointerMove={moveGesture}
                        onPointerUp={endGesture}
                        onPointerCancel={endGesture}
                      >
                        <RotateCw className="size-4" aria-hidden />
                      </button>
                      <button
                        type="button"
                        aria-label="Resize"
                        className="absolute -right-4 -bottom-4 grid size-8 cursor-nwse-resize place-items-center rounded-full border-2 border-white bg-accent text-on-accent shadow-lg"
                        style={{ touchAction: "none" }}
                        onPointerDown={(e) => startGesture(e, el, "scale")}
                        onPointerMove={moveGesture}
                        onPointerUp={endGesture}
                        onPointerCancel={endGesture}
                      >
                        <Maximize2 className="size-3.5 rotate-90" aria-hidden />
                      </button>
                    </>
                  ) : null}
                </div>
              );
            }}
          >
            <div ref={pageRef} aria-hidden className="pointer-events-none absolute inset-0" />
          </ScrapbookPage>
        </div>
      </div>

      <aside className="os-glass os-frost fixed inset-x-0 bottom-0 z-[60] rounded-t-[1.75rem] pb-[env(safe-area-inset-bottom)] shadow-[0_-18px_40px_-20px_rgb(0_0_0/0.35)] lg:sticky lg:top-24 lg:z-auto lg:rounded-[1.75rem] lg:pb-0">
        {/* Equal columns, so every tab (including Edit) fits without sideways scrolling. */}
        <div className={`grid gap-1 p-2 ${selected ? "grid-cols-6" : "grid-cols-5"}`}>
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setPanel(id)}
              className={`${tabButton} ${panel === id ? "bg-accent text-on-accent shadow" : "text-muted hover:bg-accent-soft hover:text-ink"}`}
            >
              <Icon className="size-4" aria-hidden />
              <span className="max-w-full truncate">{label}</span>
            </button>
          ))}
          {selected ? (
            <button
              type="button"
              onClick={() => setPanel("selected")}
              className={`${tabButton} ${panel === "selected" ? "bg-accent text-on-accent shadow" : "text-accent hover:bg-accent-soft"}`}
            >
              <Wand2 className="size-4" aria-hidden />
              <span className="max-w-full truncate">Edit</span>
            </button>
          ) : null}
        </div>
        <div className="max-h-[36vh] overflow-y-auto border-t border-line p-4 lg:max-h-[calc(100dvh-14rem)]">
          <div key={panel + (selected?.id ?? "")} className="animate-[os-fade-up_0.3s_ease-out_backwards]">
            {panelBody ?? <p className="text-sm text-muted">Tap something on the page to edit it.</p>}
          </div>
        </div>
      </aside>
    </div>
  );
}
