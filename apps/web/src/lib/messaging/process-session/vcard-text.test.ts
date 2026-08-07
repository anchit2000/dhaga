import { describe, expect, it } from "vitest";
import { emptyContactProfile } from "@dhaga/core";
import { vcardPlannerText } from "./vcard-text";
import { guessNames } from "./names";

/**
 * REGRESSION. A forwarded contact card used to reach the batch planner as the
 * importer's `receipt` — the fixed provenance label "Imported from vCard
 * (.vcf)", which names nobody. Three things broke, all in the class the batch
 * planner exists to prevent:
 *
 *  - guessNames saw "Imported"/"Card", so a card for somebody ALREADY in the
 *    graph never pulled them into the candidate pool → guaranteed duplicate;
 *  - the planner never learned the card's name, so a following message ("he's
 *    raising a seed round") could not be attributed to that person;
 *  - a card-only batch gave the planner nothing to name anyone with.
 *
 * The profile is still what gets WRITTEN — this is only what the planner READS.
 */
describe("a forwarded contact card as the planner sees it", () => {
  const arjun = {
    ...emptyContactProfile(),
    name: "Arjun Mehta",
    positions: [
      {
        title: "Operations Lead",
        company: "Northwind Retail",
        department: null,
        current: true,
        startedAt: null,
        endedAt: null,
        note: null,
      },
    ],
    phones: [{ value: "+919999900101", label: "Mobile", note: null }],
  };

  it("renders the person, not a provenance label", () => {
    const text = vcardPlannerText(arjun);

    // WHY each of these: the name is what makes the card matchable at all, the
    // role is what separates two people of the same name, and the labelled
    // number is what the card bothered to say and a plain list would lose.
    expect(text).toContain("Arjun Mehta");
    expect(text).toContain("Operations Lead · Northwind Retail");
    expect(text).toContain("Mobile – +919999900101");
    expect(text).not.toContain("Imported from vCard");
  });

  it("yields a name the candidate lookup can actually search on", () => {
    // The real failure was one step downstream of the text: whatever the card
    // renders to has to survive guessNames, or the existing contact is never
    // even offered to the planner and a duplicate is created every single time.
    expect(guessNames([vcardPlannerText(arjun)])).toContain("Arjun Mehta");
  });

  it("still names someone whose only listed role has ended", () => {
    // A card for someone between jobs must not render nameless — "current"
    // is not guaranteed on an imported vCard.
    const formerly = {
      ...arjun,
      positions: [{ ...arjun.positions[0], current: false }],
    };

    expect(vcardPlannerText(formerly)).toContain("Arjun Mehta");
    expect(vcardPlannerText(formerly)).toContain("Northwind Retail");
  });
});
