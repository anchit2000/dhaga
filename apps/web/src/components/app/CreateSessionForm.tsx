"use client";

import { useActionState } from "react";
import {
  createSessionAction,
  type SessionFormState,
} from "@/lib/actions/sessions";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "./SubmitButton";

export function CreateSessionForm() {
  const [state, formAction] = useActionState<SessionFormState, FormData>(
    createSessionAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="name"
          required
          placeholder="Name a session — “Web Summit 2026”"
          className="h-10 sm:max-w-sm"
        />
        <SubmitButton>Create session</SubmitButton>
      </div>
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
