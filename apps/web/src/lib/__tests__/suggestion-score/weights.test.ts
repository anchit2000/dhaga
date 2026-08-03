import { describe, expect, it } from "vitest";
import { candidate, copyOf, daysAgo, pointsOf, scored, scoreOf } from "./helpers";

/**
 * What the weights are FOR: the spread between them is the product decision —
 * things the user asserted outrank things we infer, and an occasion that expires
 * outranks one that merely waits. Each case names the pair the number decides.
 */
describe("suggestion score — weights", () => {
  it("a cadence overdue by one full period outranks a 12-connection hub", () => {
    const promise = candidate({ everyDays: 7, lastTouch: daysAgo(14) });
    const hub = candidate({ degree: 12, lastTouch: daysAgo(14) });
    // WHY: an explicit promise the user made must beat structural inference, or
    // Today silently becomes a popularity list of whoever the graph knows best.
    expect(scoreOf(promise)).toBeGreaterThan(scoreOf(hub));
  });

  it("a birthday today outranks the same person's just-due cadence", () => {
    const justDue = candidate({ everyDays: 7, lastTouch: daysAgo(7.01) });
    const birthday = candidate({
      lastTouch: daysAgo(7.01),
      importantDate: { label: "Birthday", daysUntil: 0 },
    });
    // WHY: an occasion expires at midnight; a check-in slipping a day costs
    // nothing. 30 > 0.6 × 40 = 24 is precisely what encodes that.
    expect(scoreOf(birthday)).toBeGreaterThan(scoreOf(justDue));
  });

  it("a just-due weekly cadence still outranks a long-silent hub", () => {
    const justDue = candidate({ everyDays: 7, lastTouch: daysAgo(8) });
    const hub = candidate({ degree: 40, lastTouch: daysAgo(3650) });
    // WHY: this is what the SUGGESTION_CADENCE_BASE 0.6 floor buys. With it the
    // cadence scores 40 × (0.6 + 0.4/7) ≈ 26.3 and leads the hub's 10 + 15 = 25;
    // as a bare overdue ratio it would score 40 × 1/7 ≈ 5.7 and be buried under
    // people the user never asked to be reminded about.
    expect(scoreOf(justDue)).toBeGreaterThan(scoreOf(hub));
  });

  it("a contact that becomes due later today is still labelled with its cadence", () => {
    // The cadence source asserts due-ness against SQL now(); the scorer measures
    // from local midnight, so an interval elapsing later today arrives
    // `cadenceDue` with a still-negative overdue count.
    const boundary = candidate({ everyDays: 7, lastTouch: daysAgo(6.5), cadenceDue: true });
    // WHY: without that floor this scores 0 on cadence and is labelled by its
    // next-best term — "No contact since …" on a row the user explicitly asked
    // to be reminded about, on the one day the reminder is owed.
    expect(pointsOf(scored(boundary), "cadence")).toBeGreaterThan(0);
    expect(copyOf(boundary).bucket).toBe("cadence");
  });

  it("a 3-week-old job-change signal scores below a 1-day-old one", () => {
    const headline = "Joined Acme as VP Engineering";
    const stale = candidate({ signal: { headline, createdAt: daysAgo(21) } });
    const fresh = candidate({ signal: { headline, createdAt: daysAgo(1) } });
    // WHY: congratulating three weeks late is worse than not congratulating —
    // it advertises that you only just noticed.
    expect(scoreOf(stale)).toBeLessThan(scoreOf(fresh));
  });

  it("every term saturates, so one ancient outlier cannot monopolise Today", () => {
    const silent = scored(candidate({ lastTouch: daysAgo(500) }));
    const ancient = scored(candidate({ lastTouch: daysAgo(5000) }));
    // WHY: quiet and degree are unbounded inputs. Uncapped, the contact captured
    // first and the hub with 300 edges would top Today every single day and no
    // ordinary candidate could ever reach the list.
    expect(pointsOf(ancient, "quiet") - pointsOf(silent, "quiet")).toBeLessThan(0.5);
    expect(scoreOf(candidate({ degree: 300 }))).toBe(scoreOf(candidate({ degree: 30 })));
  });
});
