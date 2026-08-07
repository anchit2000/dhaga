import { describe, expect, it } from "vitest";
import { autoAssignedWeekday, weekdayCapacityWarning } from "./capacity";

describe("keep-in-touch weekday capacity", () => {
  it("fills the least-loaded day deterministically", () => {
    expect(autoAssignedWeekday("contact-a", [1, 0, 0, 0, 0, 0, 0], 5)).toBe(1);
    expect(autoAssignedWeekday("contact-a", [1, 0, 0, 0, 0, 0, 0], 5)).toBe(1);
  });

  it("still assigns the least-loaded day when every day is full", () => {
    expect(autoAssignedWeekday("contact-b", [7, 6, 8, 8, 9, 9, 9], 5)).toBe(1);
  });

  it("warns without rejecting an explicit over-capacity choice", () => {
    expect(weekdayCapacityWarning(1, 5, 5)).toContain("6 people scheduled for Monday");
    expect(weekdayCapacityWarning(1, 4, 5)).toBeNull();
  });
});
