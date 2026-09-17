import { ArrowRight, BookHeart, CalendarHeart, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { CSSProperties, ReactNode } from "react";
import { Doodle, Stamp, Tape } from "@/components/decor/materials";
import { SvgStickerArt } from "@/components/scrapbook/stickers";
import { LinkButton } from "@/components/ui/button";
import { Reveal } from "@/components/ui/layout";
import { getSession } from "@/lib/tenant";
import { BrandMark, ScenePolaroid } from "@/components/decor/scene";

const FEATURES = [
  { icon: BookHeart, title: "Your story, together", body: "Journal the days that matter, with photos and each of your reflections." },
  { icon: Mail, title: "Letters that wait", body: "Write to each other and seal it until the day it should be opened." },
  { icon: CalendarHeart, title: "Plans and milestones", body: "Keep what's next and what you've already lived through in one place." },
  { icon: Lock, title: "Only the two of you", body: "Every space is private. No one else, not even other couples, can see inside." },
];

const ICON_TILTS = [-6, 4, -3, 6];

export default async function LandingPage() {
  if (await getSession()) redirect("/home");

  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-6xl flex-col overflow-x-clip px-5 pt-5 pb-8 sm:px-8 sm:pt-7">
      <nav className="flex items-center justify-between gap-3">
        <BrandMark href="/" className="-ml-3 text-xl" />
        <Link
          href="/login"
          className="os-glass inline-flex h-10 items-center rounded-full px-4 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:border-accent/50"
        >
          Sign in
        </Link>
      </nav>

      <section className="grid flex-1 items-center gap-14 py-12 sm:py-16 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)] lg:gap-10 lg:py-20">
        <div className="os-page-enter min-w-0">
          <p className="os-eyebrow flex items-center gap-1.5">
            <Doodle kind="sparkle" className="size-3.5" />A private journal for two
          </p>
          <h1 className="os-display mt-5 text-[2.25rem] leading-[1.08] font-medium text-ink sm:text-6xl sm:leading-[1.04] lg:text-[3.75rem]">
            Keep the story only{" "}
            <span className="relative inline-block">
              the two of you
              <svg
                aria-hidden
                viewBox="0 0 200 20"
                preserveAspectRatio="none"
                className="pointer-events-none absolute -bottom-1.5 left-0 h-3 w-full text-accent sm:-bottom-2.5 sm:h-4"
              >
                <path
                  d="M3 14C48 5 124 2 197 10"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  vectorEffect="non-scaling-stroke"
                />
              </svg>
            </span>{" "}
            know.
          </h1>
          <p aria-hidden className="os-hand mt-5 flex items-center gap-1 text-2xl text-accent sm:text-[1.75rem]">
            <Doodle kind="arrow" className="size-8 shrink-0 -rotate-12" />
            <span className="-rotate-2">and nobody else ♡</span>
          </p>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            One quiet, beautiful space for your memories, photos, plans, places and letters, shared with the one person it&apos;s about.
          </p>
          <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <LinkButton href="/signup" size="lg" className="group">
              Create your space
              <ArrowRight className="size-4 transition group-hover:translate-x-0.5" aria-hidden />
            </LinkButton>
            <LinkButton href="/login" size="lg" variant="secondary">
              I already have an account
            </LinkButton>
          </div>
        </div>

        <Collage />
      </section>

      <section aria-labelledby="features-title" className="pb-14 sm:pb-20">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          <h2 id="features-title" className="os-display text-3xl font-medium text-ink sm:text-4xl">
            Everything your story needs
          </h2>
          <p aria-hidden className="os-hand -rotate-2 text-2xl text-accent">
            all in one quiet place
          </p>
        </div>
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, body }, index) => (
            <Reveal key={title} as="li" index={index}>
              <div className="os-card os-lift h-full p-6">
                <span
                  aria-hidden
                  className="mb-5 grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent shadow-sm"
                  style={{ rotate: `${ICON_TILTS[index % ICON_TILTS.length]}deg` }}
                >
                  <Icon className="size-5" />
                </span>
                <h3 className="os-display text-xl text-ink">{title}</h3>
                <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-muted">{body}</p>
              </div>
            </Reveal>
          ))}
        </ul>
      </section>

      <Reveal as="section" className="relative pb-10">
        <Tape className="absolute -top-3 left-1/2 z-10 -translate-x-1/2" rotate={-3} pattern="dots" color="#b5d8f0" />
        <div className="os-card relative overflow-hidden px-6 py-12 text-center sm:px-12">
          <Doodle kind="heart" className="os-float absolute top-6 right-6 size-9 text-accent/25 sm:right-10" />
          <Doodle kind="star" className="os-float absolute bottom-6 left-6 size-7 text-accent/20 [animation-delay:-2s] sm:left-10" />
          <p aria-hidden className="os-hand -rotate-1 text-2xl text-accent">page one is waiting</p>
          <h2 className="os-display mt-2 text-3xl font-medium text-ink sm:text-5xl">Start your story together.</h2>
          <LinkButton href="/signup" size="lg" className="mt-8">
            Create your space
          </LinkButton>
        </div>
      </Reveal>

      <footer className="flex items-center justify-center gap-1.5 text-sm text-muted">
        Made for two
        <Doodle kind="heart" className="size-4 text-accent" />
      </footer>
    </main>
  );
}

/** Positions a collage piece, pops it in, then lets it drift. */
function Piece({
  className,
  delay,
  float,
  children,
}: {
  className: string;
  delay: number;
  float: { delay: number; duration: number };
  children: ReactNode;
}) {
  return (
    <div className={`os-pop absolute ${className}`} style={{ animationDelay: `${delay}ms` }}>
      <div className="os-float" style={{ animationDelay: `${float.delay}s`, animationDuration: `${float.duration}s` } as CSSProperties}>
        {children}
      </div>
    </div>
  );
}

/** Decorative scrapbook collage: painted polaroids, a sticky note, a stamp and stickers. */
function Collage() {
  const caption = "text-[clamp(1rem,5.2cqw,1.5rem)]";
  return (
    <div
      aria-hidden
      className="pointer-events-none relative mx-auto aspect-[5/6] w-full max-w-[24rem] select-none [container-type:inline-size] sm:max-w-[28rem] lg:max-w-[31rem]"
    >
      <Piece className="top-[3%] left-[3%] z-10 w-[52%]" delay={80} float={{ delay: 0, duration: 7 }}>
        <ScenePolaroid scene="sunset" caption="our first trip" tilt={-7} captionClassName={caption}>
          <Tape className="absolute -top-3 left-1/2 w-[46%] -translate-x-1/2" rotate={-4} pattern="stripes" color="#f6b8c2" />
        </ScenePolaroid>
      </Piece>

      <Piece className="top-[5%] right-[4%] z-20 w-[38%]" delay={260} float={{ delay: -2.5, duration: 8 }}>
        <div className="os-sticky px-[7%] pt-[9%] pb-[12%]" style={{ "--tilt": "4deg", "--note": "#fff1a8" } as CSSProperties}>
          <p className="os-hand text-[clamp(0.85rem,4.2cqw,1.15rem)] leading-none opacity-60">note to self:</p>
          <p className="os-hand mt-1 text-[clamp(1.05rem,5.6cqw,1.6rem)] leading-[1.05]">slow dances in the kitchen</p>
        </div>
      </Piece>

      <Piece className="top-[34%] right-[3%] z-20 w-[44%]" delay={420} float={{ delay: -4, duration: 9 }}>
        <ScenePolaroid scene="ocean" caption="sunday mornings" tilt={6} captionClassName={caption}>
          <Tape className="absolute -top-2 -right-4 w-[42%]" rotate={38} pattern="dots" color="#b5d8f0" />
        </ScenePolaroid>
      </Piece>

      <Piece className="bottom-[2%] left-[9%] z-30 w-[38%]" delay={580} float={{ delay: -1.5, duration: 7.5 }}>
        <ScenePolaroid scene="night" caption="us ♡" tilt={-3} captionClassName={caption}>
          <Tape className="absolute -top-2 -left-4 w-[42%]" rotate={-35} pattern="grid" color="#ffcf99" />
        </ScenePolaroid>
      </Piece>

      <Piece className="right-[7%] bottom-[3%] z-30" delay={720} float={{ delay: -3, duration: 10 }}>
        <Stamp tilt={-9} className="text-[clamp(0.6rem,3cqw,0.8rem)]">
          Kept for two ♡
        </Stamp>
      </Piece>

      <Piece className="top-[1%] left-[46%] z-40 w-[14%]" delay={860} float={{ delay: -1, duration: 6 }}>
        <div className="os-sticker">
          <SvgStickerArt id="heart" />
        </div>
      </Piece>

      <Piece className="top-[62%] left-[47%] z-40 w-[12%]" delay={980} float={{ delay: -3.5, duration: 6.5 }}>
        <div className="os-sticker">
          <SvgStickerArt id="star" />
        </div>
      </Piece>

      <Doodle kind="sparkle" className="os-float absolute top-[58%] left-[2%] size-[9%] text-accent/60 [animation-delay:-2s]" />
      <Doodle kind="squiggle" className="absolute right-[38%] bottom-[1%] h-[6%] w-[16%] text-accent/40" />
    </div>
  );
}
