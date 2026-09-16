import { BookHeart, CalendarHeart, Lock, Mail } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LinkButton } from "@/components/ui/button";
import { APP_NAME } from "@/lib/env";
import { getSession } from "@/lib/tenant";

const FEATURES = [
  { icon: BookHeart, title: "Your story, together", body: "Journal the days that matter, with photos and each of your reflections." },
  { icon: Mail, title: "Letters that wait", body: "Write to each other and seal it until the day it should be opened." },
  { icon: CalendarHeart, title: "Plans and milestones", body: "Keep what's next and what you've already lived through in one place." },
  { icon: Lock, title: "Only the two of you", body: "Every space is private. No one else, not even other couples, can see inside." },
];

export default async function LandingPage() {
  if (await getSession()) redirect("/home");

  return (
    <main className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5 py-8 sm:px-8">
      <nav className="flex items-center justify-between">
        <span className="os-display text-xl text-ink">
          {APP_NAME} <span className="text-accent">♡</span>
        </span>
        <Link href="/login" className="text-sm font-medium text-muted hover:text-ink">
          Sign in
        </Link>
      </nav>

      <section className="flex flex-1 flex-col justify-center py-20 sm:py-28">
        <p className="os-eyebrow">A private journal for two</p>
        <h1 className="os-display mt-4 max-w-3xl text-5xl leading-[1.02] font-medium text-ink sm:text-7xl">
          Keep the story only the two of you know.
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
          One quiet, beautiful space for your memories, photos, plans, places and letters, shared with the one person it&apos;s about.
        </p>
        <div className="mt-10 flex flex-wrap gap-3">
          <LinkButton href="/signup" size="lg">
            Create your space
          </LinkButton>
          <LinkButton href="/login" size="lg" variant="secondary">
            I already have an account
          </LinkButton>
        </div>
      </section>

      <section className="grid gap-4 pb-12 sm:grid-cols-2">
        {FEATURES.map(({ icon: Icon, title, body }) => (
          <div key={title} className="os-card flex gap-4 p-6">
            <Icon className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden />
            <div>
              <h2 className="os-display text-xl text-ink">{title}</h2>
              <p className="mt-1 text-[0.9375rem] leading-relaxed text-muted">{body}</p>
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
