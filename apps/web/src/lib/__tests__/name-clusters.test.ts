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

  it("clusters accented and unaccented spellings of the same surname together", () => {
    // "José" vs "Jose" — same surname, accent dropped by whoever typed the
    // second contact in. A naive lowercase-only key treats these as two
    // different tokens and never surfaces the cluster.
    const clusters = computeNameClusters([
      person("1", "Ana Núñez"),
      person("2", "Luis Nunez"),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].contactIds).toHaveLength(2);
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

  it("splits a common part joined by punctuation, not just a space", () => {
    // "Kumar_Joget" has no space between the two words, but "Joget" is
    // still a valid common part shared with "Raveesh Joget".
    const clusters = computeNameClusters([
      person("1", "Anchit Kumar_Joget"),
      person("2", "Raveesh Joget"),
    ]);
    expect(clusters).toHaveLength(1);
    expect(clusters[0].key).toBe("joget");
    expect(clusters[0].contactIds).toHaveLength(2);
  });

  it("never matches a token as a substring of a longer one", () => {
    // "Anchit" must not cluster with "Sanchit" just because the letters
    // overlap — clustering is on whole delimiter-bounded tokens only.
    const clusters = computeNameClusters([
      person("1", "Ravi Anchit"),
      person("2", "Ravi Sanchit"),
    ]);
    expect(clusters).toHaveLength(0);
  });

  it("still excludes an emailish or URLish first word, even after punctuation splitting", () => {
    const clusters = computeNameClusters([
      person("1", "john@example.com Kumar"),
      person("2", "https://example.com Kumar"),
    ]);
    // Second words ("Kumar") still cluster; the emailish/URLish given-name
    // slot is dropped whole, same as any other given name.
    expect(clusters).toHaveLength(1);
    expect(clusters[0].key).toBe("kumar");
  });
});
