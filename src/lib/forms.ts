import { z } from "zod";

/** State returned by form Server Actions (used with React's useActionState). */
export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
};

export const IDLE: FormState = { status: "idle" };

export function formError(message: string, fieldErrors?: FormState["fieldErrors"]): FormState {
  return { status: "error", message, fieldErrors };
}

export function formSuccess(message?: string): FormState {
  return { status: "success", message };
}

/** Plain object from FormData: strings only, internal Next.js fields dropped. */
export function formValues(formData: FormData): Record<string, string | string[]> {
  const values: Record<string, string | string[]> = {};
  for (const key of new Set(formData.keys())) {
    if (key.startsWith("$ACTION")) continue;
    const all = formData.getAll(key).filter((v): v is string => typeof v === "string");
    values[key] = all.length > 1 || key.endsWith("[]") ? all : (all[0] ?? "");
  }
  return values;
}

export type Parsed<T> = { ok: true; data: T } | { ok: false; state: FormState };

export function parseForm<S extends z.ZodType>(schema: S, formData: FormData): Parsed<z.infer<S>> {
  const result = schema.safeParse(formValues(formData));
  if (result.success) return { ok: true, data: result.data };
  return {
    ok: false,
    state: formError("Please check the highlighted fields.", z.flattenError(result.error).fieldErrors as FormState["fieldErrors"]),
  };
}

export function parseInput<S extends z.ZodType>(schema: S, input: unknown): Parsed<z.infer<S>> {
  const result = schema.safeParse(input);
  if (result.success) return { ok: true, data: result.data };
  return { ok: false, state: formError("Some of the details aren't valid.") };
}
