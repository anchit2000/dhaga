import { describe, expect, it } from "vitest";
import { taskInputFromForm } from "./task-input";

describe.each(["Asia/Kolkata", "America/Los_Angeles"])("task dates in %s", (timeZone) => {
  it("turns a submitted calendar day into the same canonical UTC day", () => {
    const original = process.env.TZ;
    process.env.TZ = timeZone;
    try {
      const data = new FormData();
      data.set("action", "Send the proposal");
      data.set("dueDate", "2026-08-01");
      const input = taskInputFromForm(data);
      expect(typeof input).not.toBe("string");
      if (typeof input !== "string") {
        expect(input.dueDate?.toISOString()).toBe("2026-08-01T00:00:00.000Z");
      }
    } finally {
      process.env.TZ = original;
    }
  });
});
