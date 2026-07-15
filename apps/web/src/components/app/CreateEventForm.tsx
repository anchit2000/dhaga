"use client";

import { useActionState } from "react";
import {
  createEventAction,
  type EventFormState,
} from "@/lib/actions/events";
import { Input } from "@/components/ui/input";
import { EventStyleFields } from "./EventStyleFields";
import { SubmitButton } from "./SubmitButton";

/** `withStyle` adds the colour/emoji picker at create time (Events page);
 *  omit it for compact surfaces like the home card. */
export function CreateEventForm({ withStyle = false }: { withStyle?: boolean }) {
  const [state, formAction] = useActionState<EventFormState, FormData>(
    createEventAction,
    {},
  );

  return (
    <form action={formAction} className="space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          name="name"
          required
          placeholder="Name a event — “Web Summit 2026”"
          className="h-10 sm:max-w-sm"
        />
        <SubmitButton>Create event</SubmitButton>
      </div>
      {withStyle ? <EventStyleFields /> : null}
      {state.error ? (
        <p className="text-sm text-red-400" role="alert">
          {state.error}
        </p>
      ) : null}
    </form>
  );
}
