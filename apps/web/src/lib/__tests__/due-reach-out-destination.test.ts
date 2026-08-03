import { describe, expect, it } from "vitest";
import { listContactsPage } from "@/lib/repo/contacts";
import { buildDailySuggestions, CADENCE_BUCKETS } from "@/lib/repo/daily-suggestions";
import { listDueReachOuts } from "@/lib/repo/reminders";
import { DUE_CHECK_INS_HREF } from "@/utils/constants/home";
import { dueReachOutFooter } from "@/utils/due-reach-outs";
import { makeDue, newContact, utcPrefs } from "./daily-suggestions/helpers";

/**
 * Home's Today tile ends on "+N more due", where N is `listDueReachOuts()` minus
 * the cadence rows already on screen. That footer used to link to `/app/people`,
 * the unfiltered directory — so the number described one set and the page showed
 * another, and the answer to "who else is due?" was never on it.
 *
 * These tests hold the two halves together: whatever the footer counts, its
 * destination must list, with nothing dropped and nothing extra. They fail if the
 * link is repointed at a browsable listing again, or if the destination ever
 * starts slicing/filtering the set the counter measured.
 */

/** Exactly what DashboardSection computes for the footer. */
function homeFooterCount(
  due: Awaited<ReturnType<typeof listDueReachOuts>>,
  suggestions: Awaited<ReturnType<typeof buildDailySuggestions>>["suggestions"],
): { moreDue: number; shownDue: number } {
  const shownDue = suggestions.filter((item) => CADENCE_BUCKETS.has(item.bucket)).length;
  return { moreDue: Math.max(0, due.length - shownDue), shownDue };
}

describe("Home's '+N more due' footer and its destination", () => {
  it("counts and lists the same people", async () => {
    // Four people overdue on a weekly rhythm, and one with no rhythm at all —
    // the last is the row a directory listing would wrongly include.
    for (const name of ["Due Devika", "Due Dhruv", "Due Diya", "Due Dev"]) {
      await makeDue(await newContact(name), 7, 40);
    }
    await newContact("Uncadenced Umesh");

    const due = await listDueReachOuts();
    // count: 2 forces a leftover, which is the only state the footer renders in.
    const { suggestions } = await buildDailySuggestions({
      date: new Date(),
      count: 2,
      prefs: utcPrefs,
      due,
    });
    const { moreDue, shownDue } = homeFooterCount(due, suggestions);
    expect(moreDue).toBeGreaterThan(0);

    // The destination renders this list whole (see DueCheckInsList) — so the
    // people on Today plus the people the footer promises IS the page.
    const destination = await listDueReachOuts();
    expect(destination.length).toBe(moreDue + shownDue);
    expect(destination.map((row) => row.id).sort()).toEqual(due.map((row) => row.id).sort());

    // ...and everyone Today showed as due is on it, so the hand-off is continuous
    // rather than two disjoint lists that happen to be the same size.
    const destinationIds = new Set(destination.map((row) => row.id));
    for (const item of suggestions.filter((row) => CADENCE_BUCKETS.has(row.bucket))) {
      expect(destinationIds.has(item.contactId)).toBe(true);
    }

    // The old destination, for the record: the people directory answers a
    // different question, and no cadence filter can be read off it.
    const people = await listContactsPage({ page: 1, pageSize: 200 });
    expect(people.total).toBeGreaterThan(destination.length);
  });

  it("sends the footer to the due block, never back to the people directory", () => {
    const footer = dueReachOutFooter(5);
    expect(footer.href).toBe(DUE_CHECK_INS_HREF);
    expect(footer.href).not.toBe("/app/people");
    // "this week" was a boundary the data never had — an elapsed cadence can be
    // a year late — so the label may not reintroduce one.
    expect(footer.label).toBe("+5 more due");
    expect(footer.label).not.toMatch(/week/);
  });

  it("falls back to the people directory only when nothing is left over", () => {
    // With no remainder there is no due list to hand off, and the tile's footer
    // goes back to being a plain "browse everyone" link.
    expect(dueReachOutFooter(0).href).toBe("/app/people");
    expect(dueReachOutFooter(0).label).toBe("View all people");
  });
});
