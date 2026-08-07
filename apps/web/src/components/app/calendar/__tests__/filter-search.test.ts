import { describe, expect, it } from "vitest";
import { filterFollowUps, NO_CALENDAR_FILTERS } from "../filter-follow-ups";
import type { CalendarFollowUp } from "@/lib/repo/reminders";

/**
 * The calendar carried no way to find anything: with a few dozen follow-ups the
 * only way to answer "what do I owe Acme?" was to read every chip on the month.
 *
 * The case that matters most is searching by WHO rather than what. A follow-up
 * whose action text never names the company still belongs to it — and that is
 * the common case, because nobody writes "Acme" into a task already attached to
 * an Acme contact. A box that only matched action text would look broken.
 */
function item(over: Partial<CalendarFollowUp> = {}): CalendarFollowUp {
  return {
    kind: "follow-up",
    id: "fu-1",
    contactId: "c-ada",
    contactName: "Ada Lovelace",
    companyId: null,
    companyName: null,
    associationLabel: "Ada Lovelace",
    recurrence: null,
    action: "Send the deck",
    dueDate: "2026-08-03T00:00:00.000Z",
    dueHint: null,
    status: "open",
    overdue: false,
    ...over,
  };
}

const acme = item({
  id: "fu-acme",
  contactId: null,
  contactName: null,
  companyId: "co-acme",
  companyName: "Acme Corp",
  associationLabel: "Acme Corp",
  action: "Renew the contract",
});

const search = (query: string): CalendarFollowUp[] =>
  filterFollowUps([item(), acme], { ...NO_CALENDAR_FILTERS, query });

describe("calendar search", () => {
  it("matches the COMPANY name, not just the action text", () => {
    expect(search("acme")).toEqual([acme]);
  });

  it("matches the contact name", () => {
    expect(search("lovelace").map((f) => f.id)).toEqual(["fu-1"]);
  });

  it("matches the action text", () => {
    expect(search("deck").map((f) => f.id)).toEqual(["fu-1"]);
  });

  it("ignores case and surrounding whitespace, because a search box is typed in", () => {
    expect(search("  ACME  ")).toEqual([acme]);
  });

  it("shows everything when the box is empty", () => {
    expect(search("").length).toBe(2);
  });
});
