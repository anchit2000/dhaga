import { describe, expect, it } from "vitest";
import { computeNameClusters } from "@/lib/suggestions/name-clusters";

const person = (
  id: string,
  name: string,
  tags: string[] = [],
  companyName: string | null = null,
) => ({ id, name, tags, companyName });

/**
 * Clusters are suggestions, never writes (ideas.md #4): the compute step
 * must only return data, and must stop suggesting once the user has
 * annotated — otherwise confirmed clusters nag forever.
 */
describe("name clustering suggestions", () => {
  it("clusters company-in-name saves like 'Anchit JOGET' and keeps the casing", () => {
    const clusters = computeNameClusters([
      person("1", "Anchit JOGET"),
      person("2", "Arjit JOGET"),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].key).toBe("joget");
    expect(clusters[0].display).toBe("JOGET");
    expect(clusters[0].contactIds).toHaveLength(2);
  });

  it("never clusters on given names — 'all Amits' is noise, not a community", () => {
    const clusters = computeNameClusters([
      person("1", "Amit Shah"),
      person("2", "Amit Verma"),
    ]);
    expect(clusters.find((cluster) => cluster.key === "amit")).toBeUndefined();
  });

  it("drops members already annotated, and the cluster once too few remain", () => {
    // One of three Jains is already tagged — suggest only the other two.
    const partial = computeNameClusters([
      person("1", "Priya Jain", ["jain"]),
      person("2", "Rahul Jain"),
      person("3", "Meera Jain"),
    ]);
    expect(partial[0].contactIds).toEqual(["2", "3"]);

    // Company already linked for one of two — cluster falls under minSize.
    const gone = computeNameClusters([
      person("1", "Anchit JOGET", [], "Joget"),
      person("2", "Arjit JOGET"),
    ]);
    expect(gone).toHaveLength(0);
  });

  it("ignores short/numeric tokens that can't mean anything", () => {
    const clusters = computeNameClusters([
      person("1", "Li Wu"),
      person("2", "Kai Wu"),
      person("3", "A 42"),
      person("4", "B 42"),
    ]);
    expect(clusters).toHaveLength(0);
  });
});
