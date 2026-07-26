"use client";

import { toast } from "sonner";
import type { ReactNode } from "react";
import { isNextControlFlow } from "@/lib/actions/next-control-flow";

/**
 * Run a server action from a client handler, turning a transient failure into a
 * toast instead of the full-page error boundary (which unmounts the surface and
 * loses context). redirect()/notFound() are re-thrown so the navigation still
 * fires. Returns true on success. Use in an onClick/useTransition handler; for a
 * plain `<form action={fn}>` use ActionForm below.
 */
export async function runAction(
  action: () => Promise<unknown>,
  errorMessage = "Something went wrong — please try again.",
): Promise<boolean> {
  try {
    await action();
    return true;
  } catch (error) {
    if (isNextControlFlow(error)) throw error;
    toast.error(errorMessage);
    return false;
  }
}

/**
 * Drop-in replacement for a bare `<form action={serverAction}>` that fires a
 * fire-and-forget mutation. It runs the action as an ASYNC form action, so an
 * inner <SubmitButton>'s useFormStatus spinner keeps working, but a transient
 * throw becomes a toast instead of the error boundary. redirect()/notFound()
 * still navigate (their control-flow throw is re-thrown).
 */
export function ActionForm({
  action,
  errorMessage,
  className,
  children,
}: {
  action: (formData: FormData) => Promise<unknown>;
  errorMessage?: string;
  className?: string;
  children: ReactNode;
}): React.ReactElement {
  return (
    <form
      className={className}
      action={async (formData) => {
        await runAction(() => action(formData), errorMessage);
      }}
    >
      {children}
    </form>
  );
}
