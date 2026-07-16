import { describe, expect, it } from "vitest";
import {
  buildPredicateOptions,
  filterPredicateOptions,
  previewSentence,
} from "@/components/app/relationships/AddRelationshipDialog/predicate-options";

describe("buildPredicateOptions", () => {
  it("merges built-ins with custom types, custom winning on slug collision", () => {
    // WHY: relationshipRole lets a custom row relabel a built-in predicate
    // without forking its slug; the picker must mirror that precedence or the
    // user would see two entries writing the same predicate.
    const options = buildPredicateOptions([
      { slug: "parent_of", forwardLabel: "papa of" },
      { slug: "trains_at", forwardLabel: "trains at" },
    ]);
    const parentEntries = options.filter((option) => option.slug === "parent_of");
    expect(parentEntries).toHaveLength(1);
    expect(parentEntries[0]).toMatchObject({ forward: "papa of", custom: true });
    expect(options.find((option) => option.slug === "trains_at")).toMatchObject({
      forward: "trains at",
      custom: true,
    });
    // Built-ins surface as human phrases, not raw slugs.
    expect(options.find((option) => option.slug === "friend_of")).toMatchObject({
      forward: "friend of",
      custom: false,
    });
  });

  it("sorts by the human phrase so the dropdown scans alphabetically", () => {
    const forwards = buildPredicateOptions([]).map((option) => option.forward);
    expect(forwards).toEqual([...forwards].sort((a, b) => a.localeCompare(b)));
  });
});

describe("filterPredicateOptions", () => {
  const options = buildPredicateOptions([{ slug: "trains_at", forwardLabel: "trains at" }]);

  it("matches on the phrase and on the slug spelling", () => {
    // WHY: users type either "father of" or "father_of" — both must hit.
    expect(filterPredicateOptions(options, "friend").map((o) => o.slug)).toContain("friend_of");
    expect(filterPredicateOptions(options, "trains at").map((o) => o.slug)).toContain("trains_at");
  });

  it("returns everything for a blank query (the dropdown's browse mode)", () => {
    expect(filterPredicateOptions(options, "  ")).toHaveLength(options.length);
  });
});

describe("previewSentence", () => {
  it("flipping swaps the endpoints but never rewords the predicate", () => {
    // WHY: the stored edge is directional; the toggle must show the user
    // exactly which row becomes src before they commit.
    expect(previewSentence("Ajay", "father of", "Anchit", false)).toBe(
      "Ajay — father of → Anchit",
    );
    expect(previewSentence("Ajay", "father of", "Anchit", true)).toBe(
      "Anchit — father of → Ajay",
    );
  });
});
