import { describe, expect, it, vi } from "vitest";
import { reconcileResolvedFollowUpEvent } from "../event-map";

function event() {
  return {
    remove: vi.fn(),
    setExtendedProp: vi.fn(),
    setStart: vi.fn(),
  };
}

describe("reconcileResolvedFollowUpEvent", () => {
  it("removes a terminal one-off or dismissed follow-up", () => {
    const item = event();
    reconcileResolvedFollowUpEvent(item, null);
    expect(item.remove).toHaveBeenCalledOnce();
    expect(item.setStart).not.toHaveBeenCalled();
  });

  it("keeps a recurring row and moves it to the advanced occurrence", () => {
    const item = event();
    const next = "2026-08-14T00:00:00.000Z";
    reconcileResolvedFollowUpEvent(item, next);
    expect(item.remove).not.toHaveBeenCalled();
    expect(item.setStart).toHaveBeenCalledWith("2026-08-14");
    expect(item.setExtendedProp).toHaveBeenCalledWith("dueDate", next);
  });
});
