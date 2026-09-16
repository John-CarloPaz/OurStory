"use client";

import { startTransition, useActionState, useRef, type FormEvent } from "react";
import type { FormState } from "@/lib/forms";

/**
 * Wraps a form Server Action.
 *
 * React resets every uncontrolled field after a `<form action={fn}>` finishes,
 * even when the action returned a validation error, which would wipe a long
 * journal entry or letter. Submitting through onSubmit avoids that; fields are
 * reset only when `resetOnSuccess` is set and the action actually succeeded.
 */
export function useFormAction<S extends FormState>(
  action: (previous: S, formData: FormData) => Promise<S>,
  initialState: S,
  options: { resetOnSuccess?: boolean; onSuccess?: (state: S) => void } = {},
) {
  const formRef = useRef<HTMLFormElement>(null);

  const [state, dispatch, pending] = useActionState<S, FormData>(
    async (previous, formData) => {
      const next = await action(previous as S, formData);
      if (next.status === "success") {
        if (options.resetOnSuccess) formRef.current?.reset();
        options.onSuccess?.(next);
      }
      return next;
    },
    initialState as Awaited<S>,
  );

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const formData = new FormData(event.currentTarget, submitter);
    startTransition(() => dispatch(formData));
  }

  return { state: state as S, pending, formProps: { ref: formRef, onSubmit } };
}
