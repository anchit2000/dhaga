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
import {
  affiliationPredicate,
  isAffiliationPredicate,
  isEducationPredicate,
  positionRelationFor,
} from "./relationships";

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

/**
 * These two decide whether an extracted relationship becomes a POSITION (a job
 * or a degree on the contact) or stays a plain edge, and what gets stored in
 * `positions.relation`. Getting either wrong writes junk into a table the app
 * treats as the source of truth for employment.
 */
describe("isAffiliationPredicate", () => {
  it("is true for employment and education affiliations", () => {
    expect(isAffiliationPredicate("works_at")).toBe(true);
    expect(isAffiliationPredicate("used_to_work_at")).toBe(true);
    expect(isAffiliationPredicate("interned_at")).toBe(true);
    expect(isAffiliationPredicate("studied_at")).toBe(true);
  });

  it("is false for company links that are not a role", () => {
    // WHY: a person can relate to a company without holding a position there.
    // Treating these as affiliations would invent phantom jobs on the contact's
    // Experience — and suppress the edge that should have been drawn instead.
    expect(isAffiliationPredicate("invests_in")).toBe(false);
    expect(isAffiliationPredicate("customer_of")).toBe(false);
    expect(isAffiliationPredicate("competitor_of")).toBe(false);
  });
});

describe("positionRelationFor", () => {
  it("stores NULL for plain employment, whatever tense the predicate is", () => {
    // WHY: NULL is the convention the manual editor and the importer write —
    // affiliationPredicate() derives works_at/worked_at back from isCurrent, so
    // storing "works_at" here would freeze a role as current forever.
    expect(positionRelationFor("works_at")).toBeNull();
    expect(positionRelationFor("worked_at")).toBeNull();
    expect(positionRelationFor("used_to_work_at")).toBeNull();
  });

  it("keeps every other affiliation's own predicate", () => {
    expect(positionRelationFor("studied_at")).toBe("studied_at");
    expect(positionRelationFor("board_member_of")).toBe("board_member_of");
  });
});
