import type { RecurrenceRule } from "@dhaga/core";
import type { CadenceFormSelection, CadenceUpdateResult } from "@/types";

export interface CapacityConfirmation {
  selection: CadenceFormSelection;
  warning: string;
}

export interface ScheduleClientState {
  value: CadenceFormSelection;
  persisted: CadenceFormSelection;
  warning: string | null;
  confirmation: CapacityConfirmation | null;
}

export function scheduleSelection(
  days: number | null,
  schedule: RecurrenceRule | null,
): CadenceFormSelection {
  return {
    days: days ? String(days) : "",
    weekday: schedule?.weekday == null ? "" : String(schedule.weekday),
    monthDay: schedule?.monthDay == null ? "" : String(schedule.monthDay),
    month: schedule?.month == null ? "" : String(schedule.month),
  };
}

export function applyScheduleResult(
  current: ScheduleClientState,
  requested: CadenceFormSelection,
  result: CadenceUpdateResult,
): ScheduleClientState {
  if (!result.persisted) {
    if (!result.warning) throw new Error("Unpersisted cadence needs a warning");
    return {
      ...current,
      value: requested,
      warning: result.warning,
      confirmation: { selection: requested, warning: result.warning },
    };
  }
  const value = scheduleSelection(Number(requested.days) || null, result.schedule);
  return { value, persisted: value, warning: result.warning, confirmation: null };
}

export function cancelCapacityConfirmation(state: ScheduleClientState): ScheduleClientState {
  return { ...state, value: state.persisted, warning: null, confirmation: null };
}
