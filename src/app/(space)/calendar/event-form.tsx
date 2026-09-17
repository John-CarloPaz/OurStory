"use client";

import Link from "next/link";
import { useState } from "react";
import { saveEvent } from "@/app/actions/content";
import { Tape } from "@/components/decor/materials";
import { Field, FormMessage, Input, Select, SubmitButton, Textarea } from "@/components/ui/form";
import { useFormAction } from "@/components/ui/use-form-action";
import { IDLE } from "@/lib/forms";

type EditableEvent = {
  id: string;
  title: string;
  description: string | null;
  all_day: boolean;
  location: string | null;
  place_id: string | null;
  date: string;
  startTime: string;
  endTime: string;
};

export function EventForm({
  event,
  places,
  defaultDate,
  heading,
  cancelHref = "/calendar",
}: {
  event?: EditableEvent;
  places: { id: string; name: string }[];
  defaultDate: string;
  heading?: string;
  cancelHref?: string;
}) {
  const [allDay, setAllDay] = useState(event?.all_day ?? false);
  const { state, pending, formProps } = useFormAction(saveEvent, IDLE, {
    resetOnSuccess: !event,
    onSuccess: () => {
      if (!event) setAllDay(false);
    },
  });

  return (
    <div className="relative">
      <Tape className="absolute -top-3 left-1/2 z-10 w-24 -translate-x-1/2" rotate={3} color="#b5d8f0" pattern="dots" />
      <form {...formProps} className="os-card relative space-y-5 p-6">
        <div>
          <h2 className="os-display text-2xl text-ink">{heading ?? (event ? "Edit plan" : "Add a plan")}</h2>
          <p aria-hidden className="os-hand -mt-0.5 inline-block -rotate-1 text-xl text-accent">
            {event ? "change of plans?" : "something to look forward to"}
          </p>
        </div>
        {event ? <input type="hidden" name="eventId" value={event.id} /> : null}
        <Field label="Title" name="title" state={state}>
          <Input name="title" required maxLength={160} defaultValue={event?.title} placeholder="Dinner at our spot" state={state} />
        </Field>
        <Field label="Date" name="date" state={state}>
          <Input name="date" type="date" required defaultValue={event?.date ?? defaultDate} state={state} />
        </Field>
        <label
          className={`flex h-10 w-fit cursor-pointer items-center gap-2.5 rounded-full border px-4 text-sm text-ink transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
            allDay ? "border-accent/60 bg-accent-soft" : "border-[var(--os-glass-border)] bg-[color-mix(in_srgb,var(--os-field)_65%,transparent)] hover:border-accent/40"
          }`}
        >
          <input type="checkbox" name="allDay" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="size-4 accent-[var(--os-primary)]" />
          All day
        </label>
        {!allDay ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts" name="startTime" state={state}>
              <Input name="startTime" type="time" required defaultValue={event?.startTime ?? "19:00"} state={state} />
            </Field>
            <Field label="Ends" name="endTime" state={state} optional>
              <Input name="endTime" type="time" defaultValue={event?.endTime ?? ""} state={state} />
            </Field>
          </div>
        ) : null}
        <Field label="Location" name="location" state={state} optional>
          <Input name="location" maxLength={200} defaultValue={event?.location ?? ""} state={state} />
        </Field>
        {places.length ? (
          <Field label="One of your places" name="placeId" state={state} optional>
            <Select name="placeId" defaultValue={event?.place_id ?? ""} state={state}>
              <option value="">None</option>
              {places.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}
        <Field label="Details" name="description" state={state} optional>
          <Textarea name="description" rows={3} maxLength={5000} defaultValue={event?.description ?? ""} state={state} />
        </Field>
        <FormMessage state={state} />
        <div className="flex flex-wrap items-center gap-3">
          <SubmitButton pending={pending} pendingText="Saving…">{event ? "Save" : "Add to calendar"}</SubmitButton>
          {event ? (
            <Link href={cancelHref} scroll={false} className="inline-flex h-10 items-center rounded-full px-3 text-sm text-muted hover:text-ink">
              Cancel
            </Link>
          ) : null}
        </div>
      </form>
    </div>
  );
}
