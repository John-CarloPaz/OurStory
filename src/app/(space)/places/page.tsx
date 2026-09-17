import { MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { EmptyState, PageHeader, Reveal } from "@/components/ui/layout";
import { requireActiveSpace } from "@/lib/tenant";
import { uuid } from "@/lib/validation";
import { LuggageTag, Postcard } from "./place-cards";
import { PlaceForm } from "./place-form";

export const metadata: Metadata = { title: "Places" };

const FILTERS = [
  { value: "all", label: "All" },
  { value: "visited", label: "Been there" },
  { value: "wishlist", label: "Want to go" },
] as const;

const TILTS = [-1.2, 0.9, -0.5, 1.4];

export default async function PlacesPage({ searchParams }: { searchParams: Promise<{ edit?: string; show?: string }> }) {
  const { edit, show = "all" } = await searchParams;
  const space = await requireActiveSpace();
  const { data } = await space.supabase
    .from("places")
    .select("id, name, description, address, category, status, first_visited_on, place_journals(journal_id, journals(id, title))")
    .eq("couple_id", space.coupleId)
    .order("created_at", { ascending: false });

  const all = data ?? [];
  const places = show === "visited" || show === "wishlist" ? all.filter((p) => p.status === show) : all;
  const editing = uuid.safeParse(edit).success ? all.find((p) => p.id === edit) : undefined;

  return (
    <div className="os-sections">
      <PageHeader
        eyebrow="Places"
        title="Your map of us"
        note="wish you were here"
        description="Where you've been together, and where you still want to go."
      />

      <div className="grid items-start gap-8 lg:grid-cols-[1fr_22rem]">
        <div className="space-y-7">
          <div className="os-glass inline-flex max-w-full gap-1 rounded-full p-1 shadow-sm" role="tablist" aria-label="Filter places">
            {FILTERS.map((f) => (
              <Link
                key={f.value}
                href={f.value === "all" ? "/places" : `/places?show=${f.value}`}
                aria-current={show === f.value ? "page" : undefined}
                className={`inline-flex h-10 items-center rounded-full px-4 text-sm font-medium whitespace-nowrap transition ${
                  show === f.value ? "bg-accent text-on-accent shadow-sm" : "text-muted hover:bg-accent-soft hover:text-ink"
                }`}
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
            <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2">
              {places.map((p, index) => (
                <Reveal key={p.id} as="li" index={index % 6}>
                  {p.status === "wishlist" ? (
                    <LuggageTag place={p} tilt={TILTS[index % TILTS.length]} />
                  ) : (
                    <Postcard place={p} tilt={TILTS[index % TILTS.length]} />
                  )}
                </Reveal>
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
