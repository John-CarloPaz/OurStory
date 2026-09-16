"use client";

import { useFormStatus } from "react-dom";
import type { ComponentProps, ReactNode } from "react";
import type { FormState } from "@/lib/forms";
import { buttonClass } from "./button";

const control =
  "w-full rounded-xl border border-line bg-field px-3.5 text-[0.9375rem] text-ink placeholder:text-muted/80 " +
  "transition focus:border-accent focus:outline-none focus:ring-4 focus:ring-accent/15 disabled:opacity-60 " +
  "aria-[invalid=true]:border-danger";

export function Field({
  label,
  name,
  hint,
  state,
  children,
  optional,
}: {
  label: string;
  name: string;
  hint?: ReactNode;
  state?: FormState;
  children: ReactNode;
  optional?: boolean;
}) {
  const errors = state?.fieldErrors?.[name];
  return (
    <div className="space-y-1.5">
      <label htmlFor={name} className="flex items-baseline justify-between text-sm font-medium text-ink">
        <span>{label}</span>
        {optional ? <span className="text-xs font-normal text-muted">Optional</span> : null}
      </label>
      {children}
      {errors?.length ? (
        <p id={`${name}-error`} className="text-sm text-danger">
          {errors[0]}
        </p>
      ) : hint ? (
        <p className="text-sm text-muted">{hint}</p>
      ) : null}
    </div>
  );
}

function invalidProps(name: string | undefined, state?: FormState) {
  const invalid = Boolean(name && state?.fieldErrors?.[name]?.length);
  return invalid ? { "aria-invalid": true, "aria-describedby": `${name}-error` } : {};
}

export function Input({ state, className = "", ...props }: ComponentProps<"input"> & { state?: FormState }) {
  return <input id={props.name} className={`${control} h-11 ${className}`} {...invalidProps(props.name, state)} {...props} />;
}

export function Textarea({ state, className = "", ...props }: ComponentProps<"textarea"> & { state?: FormState }) {
  return (
    <textarea
      id={props.name}
      className={`${control} min-h-28 py-3 leading-relaxed ${className}`}
      {...invalidProps(props.name, state)}
      {...props}
    />
  );
}

export function Select({ state, className = "", ...props }: ComponentProps<"select"> & { state?: FormState }) {
  return <select id={props.name} className={`${control} h-11 pr-8 ${className}`} {...invalidProps(props.name, state)} {...props} />;
}

export function SubmitButton({
  children,
  pendingText,
  variant = "primary",
  size = "md",
  className = "",
  disabled,
  pending: pendingOverride,
  ...props
}: ComponentProps<"button"> & {
  pendingText?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  /** Pass `pending` from useFormAction; otherwise the enclosing form's status is used. */
  pending?: boolean;
}) {
  const status = useFormStatus();
  const pending = pendingOverride ?? status.pending;
  return (
    <button type="submit" disabled={pending || disabled} className={buttonClass(variant, size, className)} {...props}>
      {pending && pendingText ? pendingText : children}
    </button>
  );
}

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message || state.status === "idle") return null;
  const error = state.status === "error";
  return (
    <p
      role={error ? "alert" : "status"}
      className={`rounded-xl px-4 py-3 text-sm ${error ? "bg-danger/10 text-danger" : "bg-accent-soft text-ink"}`}
    >
      {state.message}
    </p>
  );
}

/** A submit button that asks for confirmation before destructive actions. */
export function ConfirmSubmit({
  children,
  message,
  className,
  variant = "danger",
  size = "sm",
}: {
  children: ReactNode;
  message: string;
  className?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className={className ?? buttonClass(variant, size)}
      onClick={(event) => {
        if (!window.confirm(message)) event.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
