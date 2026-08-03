import { describe, expect, it } from "vitest";
import { buildDailySuggestions } from "@/lib/repo/daily-suggestions";
import { makeDue, meetingsOn, newContact, utcPrefs } from "./helpers";

/**
 * Home renders Today from a STORED free/busy snapshot, and when it has none yet
 * it builds the list with `busy: []`
 * (components/app/home/DashboardSection/calendar.ts). That degradation is only
 * safe because of the property pinned here: meeting load feeds NOTHING but the
 * trailing capacity cut, so the busy-day list is a strict PREFIX of the
 * unknown-busy one — same people, same order, just fewer of them.
 *
 * Why that is the invariant worth a test rather than the trim itself: if meeting
 * load ever reached scoring or ordering, a cold render and the next one would
 * disagree about who belongs at the top of Today, and the user would watch the
 * list silently reshuffle for no reason they could see. The trim shortening the
 * tail is a visible, explicable difference; a reorder is not.
 */
describe("meeting load only ever trims Today's tail", () => {
  it("a busy day's suggestions are a prefix of the unknown-busy list", async () => {
    for (let index = 0; index < 6; index += 1) {
      const id = await newContact(`Trim${index}`);
      // Staggered overdueness, so the ranking is strict and a reorder would show.
      await makeDue(id, 7, 30 + index);
    }
    const now = new Date();
    const base = { date: now, prefs: utcPrefs, count: 6 };

    const { suggestions: unknownBusy } = await buildDailySuggestions({ ...base, busy: [] });
    const { suggestions: onABusyDay } = await buildDailySuggestions({
      ...base,
      busy: meetingsOn(now, 3),
    });

    expect(unknownBusy.length).toBe(6);
    expect(onABusyDay.length).toBe(3);
    expect(
      unknownBusy.slice(0, onABusyDay.length).map((item) => item.contactId),
      "the busy-day list is not a prefix of the unknown-busy one — Home would reorder Today between its cold and warm renders",
    ).toEqual(onABusyDay.map((item) => item.contactId));
  });
});
