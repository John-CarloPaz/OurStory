import { BookOpen, Pencil, Trash2 } from "lucide-react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { deletePlace } from "@/app/actions/content";
import { PLACE_META, PlaceIcon } from "@/components/content-meta";
import { ConfirmSubmit } from "@/components/ui/form";
import { formatCalendarDate } from "@/lib/dates";
import { CancelLines, POSTMARK_INK, PostageStamp, SincePostmark } from "./postcard-parts";

export type PlaceCardData = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  category: string;
  status: string;
  first_visited_on: string | null;
  place_journals: { journal_id: string; journals: { id: string; title: string } | null }[];
};

const CONTROL_BASE = "inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-xs font-medium text-[#3b2f2a]/75 transition active:scale-95";

/** Straightens and lifts on hover or keyboard focus; the tilt comes from --tilt. */
const CARD_MOTION =
  "group relative h-full rotate-[var(--tilt)] transition duration-500 ease-[cubic-bezier(0.34,1.4,0.64,1)] hover:-translate-y-1 hover:rotate-0 focus-within:rotate-0";

function LinkedEntries({ links }: { links: PlaceCardData["place_journals"] }) {
  if (!links.length) return null;
  return (
    <ul className="relative mt-3 border-t border-dashed border-[#3b2f2a]/15 pt-1">
      {links.map((pj) =>
        pj.journals ? (
          <li key={pj.journal_id}>
            <Link
              href={`/story/${pj.journals.id}`}
              className="inline-flex min-h-10 items-center gap-1.5 text-sm font-medium underline decoration-dotted underline-offset-4 hover:decoration-solid"
              style={{ color: POSTMARK_INK }}
            >
              <BookOpen className="size-3.5 shrink-0" aria-hidden /> {pj.journals.title}
            </Link>
          </li>
        ) : null,
      )}
    </ul>
  );
}

function CardControls({ id }: { id: string }) {
  return (
    <div className="relative mt-auto flex gap-1 pt-3">
      <Link href={`/places?edit=${id}`} className={`${CONTROL_BASE} hover:bg-black/[0.06] hover:text-[#3b2f2a]`}>
        <Pencil className="size-3.5" aria-hidden /> Edit
      </Link>
      <form action={deletePlace}>
        <input type="hidden" name="placeId" value={id} />
        <ConfirmSubmit message="Delete this place? Entries linked to it are kept." className={`${CONTROL_BASE} hover:bg-danger/10 hover:text-danger`}>
          <Trash2 className="size-3.5" aria-hidden /> Delete
        </ConfirmSubmit>
      </form>
    </div>
  );
}

/** A place you've been: a postcard with a category stamp and a "since" postmark. */
export function Postcard({ place, tilt }: { place: PlaceCardData; tilt: number }) {
  const since = place.first_visited_on ? formatCalendarDate(place.first_visited_on, { month: "short", year: "numeric" }) : null;
  return (
    <article className={CARD_MOTION} style={{ "--tilt": `${tilt}deg` } as CSSProperties}>
      <div className="relative flex h-full flex-col rounded-[5px] bg-[#fdf8ef] p-4 text-[#3b2f2a] shadow-[0_1px_2px_rgb(40_25_10/0.14),0_22px_40px_-24px_rgb(40_25_10/0.6)] sm:p-5">
        <span aria-hidden className="pointer-events-none absolute inset-1.5 rounded-[3px] border border-[#3b2f2a]/10" />
        <div className="relative flow-root">
          <div className="relative float-right -mt-1 -mr-1 mb-1 ml-2 flex items-start">
            {since ? <SincePostmark since={since} className="z-10 mt-7 -mr-6" /> : null}
            <PostageStamp category={place.category} />
            {since ? <CancelLines className="absolute top-5 right-0 h-6 w-14" /> : null}
          </div>
          <p className="font-typewriter text-[0.68rem] tracking-[0.14em] uppercase opacity-75">
            {PLACE_META[place.category]?.label} · Been there
          </p>
          <h2 className="os-display mt-1 text-2xl leading-snug break-words">{place.name}</h2>
          {place.address ? <p className="mt-1 text-sm opacity-75">{place.address}</p> : null}
          {place.description ? (
            <p className="os-hand mt-3 text-[1.35rem] leading-[1.25] break-words whitespace-pre-wrap">{place.description}</p>
          ) : null}
        </div>
        <LinkedEntries links={place.place_journals} />
        <CardControls id={place.id} />
      </div>
    </article>
  );
}

const TAG_SHAPE = "polygon(2rem 0, 100% 0, 100% 100%, 2rem 100%, 0 calc(100% - 2rem), 0 2rem)";

/** A place you want to go: a kraft luggage tag on a bit of string. */
export function LuggageTag({ place, tilt }: { place: PlaceCardData; tilt: number }) {
  return (
    <article className={CARD_MOTION} style={{ "--tilt": `${tilt}deg` } as CSSProperties}>
      <div className="relative h-full drop-shadow-[0_16px_18px_rgb(40_25_10/0.24)]">
        <div
          className="relative flex h-full flex-col py-4 pr-4 pl-14 text-[#3b2f2a] sm:py-5 sm:pr-5"
          style={{ clipPath: TAG_SHAPE, background: "linear-gradient(165deg, #f1ddb6, #e1c38f)" }}
        >
          <span aria-hidden className="pointer-events-none absolute inset-y-2 right-2 left-10 rounded-[4px] border-[1.5px] border-dashed border-[#3b2f2a]/20" />
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 left-3 size-5 -translate-y-1/2 rounded-full shadow-[inset_0_1px_2px_rgb(0_0_0/0.45)]"
            style={{ background: "radial-gradient(circle, rgb(40 25 10 / 0.78) 0 34%, #f6ead2 38% 60%, #b99a6b 64%)" }}
          />
          <div className="relative flow-root">
            <span
              aria-hidden
              className="pointer-events-none float-right mb-1 ml-2 grid size-12 rotate-[8deg] place-items-center rounded-full border-2 border-dashed mix-blend-multiply"
              style={{ color: POSTMARK_INK, borderColor: "currentColor" }}
            >
              <PlaceIcon category={place.category} className="size-5" />
            </span>
            <p className="font-typewriter text-[0.68rem] tracking-[0.14em] uppercase opacity-75">
              Want to go · {PLACE_META[place.category]?.label}
            </p>
            <h2 className="os-display mt-1 text-2xl leading-snug break-words">{place.name}</h2>
            {place.address ? <p className="mt-1 text-sm opacity-80">{place.address}</p> : null}
            {place.description ? (
              <p className="os-hand mt-3 text-[1.35rem] leading-[1.25] break-words whitespace-pre-wrap">{place.description}</p>
            ) : null}
          </div>
          <LinkedEntries links={place.place_journals} />
          <CardControls id={place.id} />
        </div>
        {/* The string through the eyelet. */}
        <svg
          aria-hidden
          viewBox="0 0 36 76"
          className="pointer-events-none absolute top-[calc(50%-4.5rem)] left-0 h-[4.75rem] w-9 overflow-visible"
          fill="none"
          strokeLinecap="round"
        >
          <path d="M22 72 C 6 62, 2 44, 10 30 S 30 8, 14 -4" stroke="#8a6a45" strokeWidth="2.2" />
          <path d="M22 72 C 6 62, 2 44, 10 30 S 30 8, 14 -4" stroke="#d8bb8a" strokeWidth="1" strokeDasharray="2 3" />
        </svg>
      </div>
    </article>
  );
}
