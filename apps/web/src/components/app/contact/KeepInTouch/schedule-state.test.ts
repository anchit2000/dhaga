import { describe, expect, it } from "vitest";
import {
  applyScheduleResult,
  cancelCapacityConfirmation,
  scheduleSelection,
  type ScheduleClientState,
} from "./schedule-state";

const AUTO = { days: "7", weekday: "", monthDay: "", month: "" };

function initial(): ScheduleClientState {
  const value = scheduleSelection(null, null);
  return { value, persisted: value, warning: null, confirmation: null };
}

describe("keep-in-touch client reconciliation", () => {
  it("replaces Auto with the concrete weekday returned by the server", () => {
    const state = applyScheduleResult(initial(), AUTO, {
      persisted: true,
      schedule: { frequency: "weekly", interval: 1, weekday: 3, monthDay: null, month: null },
      warning: null,
    });
    expect(state.value.weekday).toBe("3");
    expect(state.persisted).toEqual(state.value);
    expect(state.confirmation).toBeNull();
  });

  it("keeps an overloaded choice as an unsaved draft until explicitly confirmed", () => {
    const requested = { ...AUTO, weekday: "1" };
    const preview = applyScheduleResult(initial(), requested, {
      persisted: false,
      schedule: { frequency: "weekly", interval: 1, weekday: 1, monthDay: null, month: null },
      warning: "Monday is above capacity.",
    });
    expect(preview.value).toEqual(requested);
    expect(preview.confirmation?.selection).toEqual(requested);
    expect(cancelCapacityConfirmation(preview).value).toEqual(initial().persisted);
  });
});
