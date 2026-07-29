/**
 * These two helpers decide the STORED predicate and the education/employment
 * split for every affiliation edge the graph and the relationship UI render, so
 * the rules they encode are contracts, not incidental strings:
 *  - a plain employment role (relation === null) must fall back to works_at when
 *    current and worked_at when past — that split is what lets a former job read
 *    "former employer" rather than "employer".
 *  - an explicit relation (studied_at, board_member_of, …) must WIN over that
 *    fallback regardless of isCurrent, so a labeled affiliation is never silently
 *    relabeled as employment.
 *  - isEducationPredicate must separate schooling from employment: a false
 *    negative on studied_at (or a false positive on works_at) would file a job
 *    under education, or a degree under employment, in any UI that branches on it.
 */
import { describe, it, expect } from "vitest";
import { affiliationPredicate, isEducationPredicate } from "./relationships";

describe("affiliationPredicate", () => {
  it("falls back to works_at for a plain CURRENT role", () => {
    expect(affiliationPredicate({ relation: null, isCurrent: true })).toBe("works_at");
  });

  it("falls back to worked_at for a plain PAST role", () => {
    // WHY: the past/current split is the whole reason a former job can read
    // "former employer" — collapse it and history is mislabeled as present.
    expect(affiliationPredicate({ relation: null, isCurrent: false })).toBe("worked_at");
  });

  it("lets an explicit relation win over the employment fallback, current or not", () => {
    // WHY: a studied_at row is an affiliation the user (or extraction) asserted;
    // deriving works_at/worked_at from isCurrent here would erase that label —
    // and it must hold whether or not the role is marked current.
    expect(affiliationPredicate({ relation: "studied_at", isCurrent: true })).toBe("studied_at");
    expect(affiliationPredicate({ relation: "studied_at", isCurrent: false })).toBe("studied_at");
  });
});

describe("isEducationPredicate", () => {
  it("is true for the education predicates", () => {
    expect(isEducationPredicate("studied_at")).toBe(true);
    expect(isEducationPredicate("attended")).toBe(true);
  });

  it("is false for employment and unknown predicates", () => {
    // WHY: works_at/worked_at are employment, not schooling, and an unknown slug
    // is not education either — a wrong answer here misfiles the edge in any UI
    // that branches education vs employment.
    expect(isEducationPredicate("works_at")).toBe(false);
    expect(isEducationPredicate("worked_at")).toBe(false);
    expect(isEducationPredicate("board_member_of")).toBe(false);
  });
});
