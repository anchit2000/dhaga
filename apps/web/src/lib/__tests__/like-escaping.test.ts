import { describe, expect, it } from "vitest";
import { emptyExtractedContact } from "@dhaga/core";
import { createContact } from "@/lib/repo/contacts";
import { createEntity } from "@/lib/repo/entities";
import { createNodeType } from "@/lib/repo/node-types";
import {
  resolveEntityObject,
  resolvePersonObject,
} from "@/lib/repo/edge-suggestions";
import { escapeLike } from "@/utils/escape-like";

describe("escapeLike", () => {
  it("escapes exactly the LIKE metacharacters: backslash, % and _", () => {
    expect(escapeLike("100% Gym_A\\B")).toBe("100\\% Gym\\_A\\\\B");
    expect(escapeLike("plain name")).toBe("plain name");
  });
});

/**
 * Candidate lookups feed the unique-exact-match auto-link gate: LLM-extracted
 * object names go straight into ILIKE, so an unescaped '%' or '_' widens the
 * match set, turns a unique match into a fake ambiguity, and demotes an
 * auto-linkable edge to a confirmation prompt (or links the wrong node).
 */
describe("candidate lookups treat extracted names literally", () => {
  it("auto-links '100% Gym' exactly instead of wildcarding into other gyms", async () => {
    const typeId = await createNodeType({ name: "Gym", color: "#e2a44c" });
    const exact = await createEntity({ typeId, name: "100% Gym" });
    // Matches the pattern '100% Gym' if '%' is treated as a wildcard.
    await createEntity({ typeId, name: "100th Street Gym" });

    const resolution = await resolveEntityObject("100% Gym");
    expect(resolution).toEqual({ kind: "edge", dstId: exact });
  });

  it("treats '_' in a person's name as a literal, not a single-char wildcard", async () => {
    const ana = await createContact(
      { ...emptyExtractedContact(), name: "An_a Underscore" },
      "manual",
    );
    // Matches the pattern 'An_a …' if '_' is treated as a wildcard.
    await createContact({ ...emptyExtractedContact(), name: "Anna Underscore" }, "manual");

    const resolution = await resolvePersonObject("An_a Underscore");
    expect(resolution).toEqual({ kind: "edge", dstId: ana });
  });
});
