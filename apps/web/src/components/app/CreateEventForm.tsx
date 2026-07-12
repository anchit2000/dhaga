"use client";

import { useActionState } from "react";
import {
  createEventAction,
  type EventFormState,
} from "@/lib/actions/events";
import { Input } from "@/components/ui/input";
import { SubmitButton } from "./SubmitButton";

export function CreateEventForm() {
  const [state, formAction] = useActionState<EventFormState, FormData>(
    createEventAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="name"
          required
          placeholder="Name a event — “Web Summit 2026”"
          className="h-10 sm:max-w-sm"
        />
        <SubmitButton>Create event</SubmitButton>
      </div>
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
