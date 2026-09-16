import { BookOpen, MapPin, Pencil, Trash2 } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { deletePlace } from "@/app/actions/content";
import { PLACE_META, PlaceIcon } from "@/components/content-meta";
import { ConfirmSubmit } from "@/components/ui/form";
import { Badge, EmptyState, PageHeader } from "@/components/ui/layout";
import { formatCalendarDate } from "@/lib/dates";
import { requireActiveSpace } from "@/lib/tenant";
import { uuid } from "@/lib/validation";
import { PlaceForm } from "./place-form";

export const metadata: Metadata = { title: "Places" };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "visited", label: "Been there" },
  { value: "wishlist", label: "Want to go" },
] as const;

export default async function PlacesPage({ searchParams }: { searchParams: Promise<{ edit?: string; show?: string }> }) {
  const { edit, show = "all" } = await searchParams;
  const space = await requireActiveSpace();
  const { data } = await space.supabase
    .from("places")
    .select("id, name, description, address, category, status, first_visited_on, place_journals(journal_id, journals(id, title))")
    .order("created_at", { ascending: false });

  const all = data ?? [];
  const places = show === "visited" || show === "wishlist" ? all.filter((p) => p.status === show) : all;
  const editing = uuid.safeParse(edit).success ? all.find((p) => p.id === edit) : undefined;

  return (
    <div className="os-sections">
      <PageHeader eyebrow="Places" title="Your map of us" description="Where you've been together, and where you still want to go." />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-5">
          <div className="flex gap-2" role="tablist" aria-label="Filter places">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={f.value === "all" ? "/places" : `/places?show=${f.value}`}
                aria-current={show === f.value ? "page" : undefined}
                className={`rounded-full px-3.5 py-1.5 text-sm transition ${show === f.value ? "bg-accent text-on-accent" : "border border-line text-muted hover:text-ink"}`}
              >
                {f.label}
              </Link>
            ))}
          </div>

          {places.length === 0 ? (
            <EmptyState icon={<MapPin className="size-5" />} title={all.length ? "Nothing here yet" : "No places yet"}>
              The café where it started, the city you keep going back to, the island on your list.
            </EmptyState>
          ) : (
            <ul className="grid gap-[var(--os-gap)] sm:grid-cols-2">
              {places.map((p) => (
                <li key={p.id} className="os-card flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="grid size-10 place-items-center rounded-full bg-accent-soft text-accent">
                      <PlaceIcon category={p.category} className="size-4" />
                    </span>
                    <Badge tone={p.status === "wishlist" ? "neutral" : "accent"}>{p.status === "wishlist" ? "Want to go" : "Been there"}</Badge>
                  </div>
                  <h2 className="os-display mt-4 text-2xl leading-snug text-ink">{p.name}</h2>
                  <p className="text-sm text-muted">
                    {PLACE_META[p.category]?.label}
                    {p.first_visited_on ? ` · since ${formatCalendarDate(p.first_visited_on, { month: "short", year: "numeric" })}` : ""}
                  </p>
                  {p.address ? <p className="mt-2 text-sm text-muted">{p.address}</p> : null}
                  {p.description ? <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-ink/90">{p.description}</p> : null}
                  {p.place_journals.length ? (
                    <ul className="mt-4 space-y-1">
                      {p.place_journals.map((pj) =>
                        pj.journals ? (
                          <li key={pj.journal_id}>
                            <Link href={`/story/${pj.journals.id}`} className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline">
                              <BookOpen className="size-3.5" aria-hidden /> {pj.journals.title}
                            </Link>
                          </li>
                        ) : null,
                      )}
                    </ul>
                  ) : null}
                  <div className="mt-auto flex gap-1 pt-4">
                    <Link href={`/places?edit=${p.id}`} className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted hover:bg-accent-soft hover:text-ink">
                      <Pencil className="size-3" aria-hidden /> Edit
                    </Link>
                    <form action={deletePlace}>
                      <input type="hidden" name="placeId" value={p.id} />
                      <ConfirmSubmit message="Delete this place? Entries linked to it are kept." className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-muted hover:bg-danger/10 hover:text-danger">
                        <Trash2 className="size-3" aria-hidden /> Delete
                      </ConfirmSubmit>
                    </form>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="lg:sticky lg:top-20">
          <PlaceForm key={editing?.id ?? "new"} place={editing} />
        </div>
      </div>
    </div>
  );
}
