import { describe, expect, it } from "vitest";
import { inScope, inStatus, matchesTaskSearch } from "./filters";
import type { TaskItem } from "@/lib/repo/tasks";

function task(overrides: Partial<TaskItem> = {}): TaskItem {
  return {
    id: "t1",
    contactId: null,
    contactName: null,
    companyId: null,
    companyName: null,
    action: "Send the deck",
    dueHint: null,
    dueDate: null,
    recurrence: null,
    status: "open",
    createdAt: new Date("2026-08-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("task search", () => {
  it("finds a task by a company the action text never mentions", () => {
    const item = task({ companyId: "c1", companyName: "Acme Robotics", action: "Send the deck" });

    // WHY: the row shows the company chip, so a user who remembers "that thing
    // for Acme" must be able to type it. Matching only the action text would
    // hide a task that is visibly labelled with the word being searched.
    expect(matchesTaskSearch(item, "acme")).toBe(true);
    expect(matchesTaskSearch(task(), "acme")).toBe(false);
  });

  it("finds a task by the attached person's name, case-insensitively", () => {
    const item = task({ contactId: "p1", contactName: "Priya Raman" });

    // WHY: same reason as the company — and nobody types capitals in a filter box.
    expect(matchesTaskSearch(item, "priya")).toBe(true);
    expect(matchesTaskSearch(item, "RAMAN")).toBe(true);
  });

  it("treats a blank or whitespace-only query as no filter", () => {
    // WHY: the input is passed through raw, so an empty box must show the whole
    // list rather than filtering everything away.
    expect(matchesTaskSearch(task(), "")).toBe(true);
    expect(matchesTaskSearch(task(), "   ")).toBe(true);
  });
});

describe("task scope", () => {
  it("excludes a general task from the People and Companies scopes", () => {
    const general = task();

    // WHY: the scope chips answer "whose work is this". A task with no person
    // and no company is the user's own admin item; surfacing it under People
    // would make that chip meaningless.
    expect(inScope(general, "general")).toBe(true);
    expect(inScope(general, "people")).toBe(false);
    expect(inScope(general, "companies")).toBe(false);
    expect(inScope(general, "all")).toBe(true);
  });

  it("keeps an attached task out of General even when only a company is named", () => {
    const attached = task({ companyId: "c1", companyName: "Acme Robotics" });

    // WHY: General means "attached to nobody", not "attached to no person".
    expect(inScope(attached, "general")).toBe(false);
    expect(inScope(attached, "companies")).toBe(true);
  });
});

describe("task status", () => {
  it("maps the Active and Completed chips onto the stored status", () => {
    // WHY: the UI vocabulary and the repo vocabulary differ; a slip here shows
    // finished work in the active list, which is the whole point of the tab.
    expect(inStatus(task({ status: "open" }), "active")).toBe(true);
    expect(inStatus(task({ status: "open" }), "completed")).toBe(false);
    expect(inStatus(task({ status: "done" }), "completed")).toBe(true);
  });
});
