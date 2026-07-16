import { describe, expect, it } from "vitest";
import { relationshipRole } from "@dhaga/core";
import type { RelationshipLabelMap } from "@dhaga/core";

const custom: RelationshipLabelMap = {
  father_of: { forward: "father of", inverse: "child of" },
  // Deliberately collides with the built-in parent_of to prove precedence.
  parent_of: { forward: "guardian of", inverse: "ward of" },
};

/**
 * User-defined relationship_types extend the built-in role map at runtime.
 * The same single stored edge must still read correctly from BOTH ends —
 * that's the entire reason forward/inverse labels exist.
 */
describe("relationshipRole with a custom label map", () => {
  it("labels a custom predicate from both ends of one stored edge", async () => {
    // Edge: Ajay --father_of--> Anchit. From Ajay's seat (source), the OTHER
    // person is his child; from Anchit's seat, the other person is the father.
    expect(relationshipRole("father_of", true, custom)).toBe("child of");
    expect(relationshipRole("father_of", false, custom)).toBe("father of");
  });

  it("lets a user redefine a built-in predicate without forking its slug", () => {
    expect(relationshipRole("parent_of", true, custom)).toBe("ward of");
    expect(relationshipRole("parent_of", false, custom)).toBe("guardian of");
  });

  it("keeps built-in and fallback behavior when the map doesn't cover a predicate", () => {
    // Built-ins still invert…
    expect(relationshipRole("sibling_of", true, custom)).toBe("sibling");
    // …and unknown predicates still humanize rather than invent a wrong inverse.
    expect(relationshipRole("collaborated_with", true, custom)).toBe("collaborated with");
  });

  it("stays backward compatible for existing two-argument callers", () => {
    expect(relationshipRole("parent_of", true)).toBe("child");
    expect(relationshipRole("father_of", false)).toBe("father of");
  });
});
