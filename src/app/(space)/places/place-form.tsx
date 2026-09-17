"use client";

import Link from "next/link";
import { savePlace } from "@/app/actions/content";
import { PLACE_META } from "@/components/content-meta";
import { buttonClass } from "@/components/ui/button";
import { Field, FormMessage, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { IDLE } from "@/lib/forms";
import { useFormAction } from "@/components/ui/use-form-action";
import { PostageStamp } from "./postcard-parts";

type Place = {
  id: string;
  name: string;
  description: string | null;
  address: string | null;
  category: string;
  status: string;
  first_visited_on: string | null;
};

export function PlaceForm({ place }: { place?: Place }) {
  const { state, pending, formProps } = useFormAction(savePlace, IDLE, { resetOnSuccess: !place });

  return (
    <form {...formProps} className="os-card relative space-y-5 p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="os-eyebrow">{place ? "Editing a postcard" : "New postcard"}</p>
          <h2 className="os-display mt-1 text-2xl text-ink">{place ? "Edit place" : "Add a place"}</h2>
        </div>
        <PostageStamp category={place?.category ?? "travel"} size="sm" className="-mt-1 mr-1 shrink-0" />
      </div>
      {place ? <input type="hidden" name="placeId" value={place.id} /> : null}
      <Field label="Name" name="name" state={state}>
        <Input name="name" required maxLength={160} defaultValue={place?.name} placeholder="Café Lumière" state={state} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Kind" name="category" state={state}>
          <Select name="category" defaultValue={place?.category ?? "food"} state={state}>
            {Object.entries(PLACE_META).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Status" name="status" state={state}>
          <Select name="status" defaultValue={place?.status ?? "visited"} state={state}>
            <option value="visited">Been there</option>
            <option value="wishlist">Want to go</option>
          </Select>
        </Field>
      </div>
      <Field label="Address or area" name="address" state={state} optional>
        <Input name="address" maxLength={300} defaultValue={place?.address ?? ""} state={state} />
      </Field>
      <Field label="First time there" name="firstVisitedOn" state={state} optional>
        <Input name="firstVisitedOn" type="date" defaultValue={place?.first_visited_on ?? ""} state={state} />
      </Field>
      <Field label="Why it matters" name="description" state={state} optional>
        <Textarea
          name="description"
          rows={3}
          maxLength={5000}
          defaultValue={place?.description ?? ""}
          placeholder="What you remember most…"
          state={state}
          className="os-hand !text-xl !leading-snug"
        />
      </Field>
      <FormMessage state={state} />
      <div className="flex items-center gap-3">
        <SubmitButton pending={pending} pendingText="Saving…">
          {place ? "Save" : "Add place"}
        </SubmitButton>
        {place ? (
          <Link href="/places" className={buttonClass("ghost")}>
            Cancel
          </Link>
        ) : null}
      </div>
    </form>
  );
}
