import { beforeAll, describe, expect, it } from "vitest";
import { emptyExtractedContact } from "@dhaga/core";
import { createContact, findOrCreateCompany } from "@/lib/repo/contacts";
import { createEntity } from "@/lib/repo/entities";
import { createEvent } from "@/lib/repo/events";
import { createNodeType } from "@/lib/repo/node-types";
import { searchGraphTargets } from "@/lib/repo/graph-data";

/**
 * The typeahead feeds both the warm-path search and the add-relationship
 * picker — every node kind must stay reachable even when one kind dominates
 * the matches, or users simply cannot select the node they typed toward.
 */
describe("searchGraphTargets", () => {
  beforeAll(async () => {
    for (let i = 0; i < 9; i++) {
      await createContact(
        { ...emptyExtractedContact(), name: `Acme Person ${i}` },
        "manual",
      );
    }
    await findOrCreateCompany("Acme Corp");
    const typeId = await createNodeType({ name: "Gym", color: "#e2a44c" });
    await createEntity({ typeId, name: "Acme Gym" });
    await createEvent("Acme Expo");
  });

  it("interleaves kinds fairly — many contact matches cannot starve the rest", async () => {
    const targets = await searchGraphTargets("Acme");
    // WHY: with nine matching contacts, the old concat-then-slice returned
    // ONLY contacts — the company/entity/event the user typed toward never
    // surfaced. Fair round-robin must keep every kind in the capped list.
    expect(targets).toHaveLength(8);
    expect(new Set(targets.map((target) => target.kind))).toEqual(
      new Set(["contact", "company", "entity", "event"]),
    );
  });

  it("restricts results to the requested kinds", async () => {
    const targets = await searchGraphTargets("Acme", ["contact", "company"]);
    // WHY: warm paths can only path-find people and companies — an entity or
    // event offered here would guarantee a misleading "no thread" result.
    expect(targets.length).toBeGreaterThan(0);
    expect(targets.every((target) => target.kind === "contact" || target.kind === "company")).toBe(true);
    expect(targets.some((target) => target.kind === "company")).toBe(true);
  });

  it("ranks prefix matches ahead of substring matches within a kind", async () => {
    await findOrCreateCompany("Bolt Industries");
    await findOrCreateCompany("Thunder Bolt Ltd");
    const companies = (await searchGraphTargets("Bolt")).filter(
      (target) => target.kind === "company",
    );
    // WHY: "Bolt" should surface the company named Bolt before companies that
    // merely contain the word — that is what a typeahead user is reaching for.
    expect(companies.map((target) => target.label)).toEqual([
      "Bolt Industries",
      "Thunder Bolt Ltd",
    ]);
  });

  it("returns nothing for a blank query or an empty kind whitelist", async () => {
    expect(await searchGraphTargets("   ")).toEqual([]);
    expect(await searchGraphTargets("Acme", [])).toEqual([]);
  });
});
