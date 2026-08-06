"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { setCadenceAction } from "@/lib/actions/reminders";
import {
  applyScheduleResult,
  cancelCapacityConfirmation,
  scheduleSelection,
  type CapacityConfirmation,
  type ScheduleClientState,
} from "./schedule-state";
import type { CadenceFormSelection } from "@/types";
import type { RecurrenceRule } from "@dhaga/core";

export function useSchedule({
  contactId,
  everyDays,
  schedule,
  initialWarning,
}: {
  contactId: string;
  everyDays: number | null;
  schedule: RecurrenceRule | null;
  initialWarning: string | null;
}): {
  value: CadenceFormSelection;
  pending: boolean;
  warning: string | null;
  confirmation: CapacityConfirmation | null;
  save: (next: CadenceFormSelection) => void;
  confirm: () => void;
  cancel: () => void;
} {
  const source = scheduleSelection(everyDays, schedule);
  const [scoped, setScoped] = useState<{ contactId: string; state: ScheduleClientState }>({
    contactId,
    state: { value: source, persisted: source, warning: initialWarning, confirmation: null },
  });
  const [pending, startTransition] = useTransition();
  const state = scoped.contactId === contactId
    ? scoped.state
    : { value: source, persisted: source, warning: initialWarning, confirmation: null };

  function persist(next: CadenceFormSelection, confirmOverCapacity: boolean): void {
    setScoped({ contactId, state: { ...state, value: next, confirmation: null } });
    startTransition(async () => {
      const formData = new FormData();
      formData.set("contactId", contactId);
      formData.set("confirmOverCapacity", String(confirmOverCapacity));
      for (const [key, value] of Object.entries(next)) formData.set(key, value);
      try {
        const result = await setCadenceAction(formData);
        setScoped((current) => ({
          contactId,
          state: applyScheduleResult(
            current.contactId === contactId ? current.state : state,
            next,
            result,
          ),
        }));
      } catch {
        setScoped({ contactId, state: { ...state, value: state.persisted } });
        toast.error("Couldn't update the reminder — try again.");
      }
    });
  }

  function cancel(): void {
    setScoped({ contactId, state: cancelCapacityConfirmation(state) });
  }

  return {
    value: state.value,
    pending,
    warning: state.warning,
    confirmation: state.confirmation,
    save: (next) => persist(next, false),
    confirm: () => {
      if (state.confirmation) persist(state.confirmation.selection, true);
    },
    cancel,
  };
}
