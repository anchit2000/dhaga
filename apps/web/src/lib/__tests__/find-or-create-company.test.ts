import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { addAlias } from "@/lib/repo/company-aliases";
import { createCompany } from "@/lib/repo/companies";
import { findOrCreateCompany } from "@/lib/repo/contacts";

/** Unique lowercase token so names here never collide with another test's rows
 *  in the same file-scoped PGlite. */
function token(): string {
  return randomUUID().replace(/-/g, "").slice(0, 8);
}

/**
 * findOrCreateCompany is the single capture-time choke point that turns an
 * employer name into a company id, so its lookup ORDER is a data-integrity
 * contract: a name merged away survives only as an alias and must resolve to the
 * SURVIVING company (never fork a fresh duplicate), yet a name that is some
 * company's actual, exact name must resolve to THAT company even when it also
 * happens to be another company's alias. Get the order wrong and captures either
 * duplicate a merged company or get hijacked by a stale alias.
 */
describe("findOrCreateCompany resolves aliases", () => {
  it("resolves a name that exists only as an alias to the aliased company, minting no duplicate", async () => {
    const tag = token();
    const { id: chitkara } = await createCompany({ name: `Chitkara University ${tag}` });
    await addAlias(chitkara, `Chitkara ${tag}`);

    // WHY: after a merge the losing name lives on only as an alias; a later
    // capture that still types it must land on the survivor, not create a second
    // company row that re-forks what the merge just consolidated.
    expect(await findOrCreateCompany(`Chitkara ${tag}`)).toBe(chitkara);
  });

  it("prefers an exact company-name match over an alias pointing elsewhere", async () => {
    const tag = token();
    const name = `Acme ${tag}`;
    const { id: acme } = await createCompany({ name }); // the real Acme
    const { id: other } = await createCompany({ name: `Other ${tag}` });
    await addAlias(other, name); // Other is ALSO known by "Acme <tag>"

    // WHY: an exact name is a stronger signal than an alias — a capture of the
    // real company's own name must resolve to it, never to whoever aliased that
    // name. The exact-match-first ordering is the only thing that guarantees it.
    expect(await findOrCreateCompany(name)).toBe(acme);
  });
});
