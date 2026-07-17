import { describe, expect, it } from "vitest";
import {
  buildPredicateOptions,
  filterPredicateOptions,
  previewSentence,
} from "@/components/app/relationships/AddRelationshipDialog/predicate-options";

describe("buildPredicateOptions is kind-aware", () => {
  // WHY (found live): the picker only suggested person↔person predicates, so
  // users hand-created works_at/attended/member_of types — with inverse
  // labels to author — for the org relations the product already understands.
  it("suggests org predicates once a company target is picked", () => {
    const options = buildPredicateOptions([], "contact", "company");
    expect(options.map((option) => option.slug)).toContain("works_at");
    expect(options.map((option) => option.slug)).not.toContain("parent_of");
  });

  it("uses the non-person endpoint's vocabulary regardless of dialog side", () => {
    // Entity page dialog (source = entity), target still unpicked.
    const options = buildPredicateOptions([], "entity", null);
    expect(options.map((option) => option.slug)).toContain("member_of");
    expect(options.map((option) => option.slug)).not.toContain("sibling_of");
  });

  it("keeps person↔person defaults and custom precedence intact", () => {
    const options = buildPredicateOptions(
      [{ slug: "works_at", forwardLabel: "grinds at" }],
      "contact",
      "event",
    );
    // Event vocabulary, with the user's custom row still winning its slug.
    expect(options.map((option) => option.slug)).toContain("attended");
    expect(options.find((option) => option.slug === "works_at")).toMatchObject({
      forward: "grinds at",
      custom: true,
    });
    expect(buildPredicateOptions([]).map((option) => option.slug)).toContain("parent_of");
  });
});

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
