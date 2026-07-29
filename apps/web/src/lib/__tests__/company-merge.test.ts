import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { and, eq, ilike, isNull, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/request-scope";
import { companies, companyAliases, contacts, edges, positions } from "@/lib/db/schema";
import { createContact } from "@/lib/repo/contacts";
import {
  createCompany,
  deleteCompany,
  findDuplicateCompanyClusters,
  mergeCompanies,
} from "@/lib/repo/companies";

/** An ExtractedContact optionally employed at `company` (matched to a companies
 *  row by name via findOrCreateCompany). */
function person(name: string, company: string | null) {
  return { name, title: null, company, emails: [], phones: [], links: [], location: null };
}

/** Unique lowercase token so names here never collide with another test's rows
 *  in the same file-scoped PGlite. */
function token(): string {
  return randomUUID().replace(/-/g, "").slice(0, 8);
}

async function contactCompanyId(id: string): Promise<string | null> {
  const db = await getDb();
  const [row] = await db.select({ companyId: contacts.companyId }).from(contacts).where(eq(contacts.id, id)).limit(1);
  return row?.companyId ?? null;
}

async function positionCompanyIds(contactId: string): Promise<(string | null)[]> {
  const db = await getDb();
  const rows = await db.select({ companyId: positions.companyId }).from(positions).where(eq(positions.contactId, contactId));
  return rows.map((r) => r.companyId);
}

// mergeCompanies must make the survivor the single home for everything the
// losing companies referenced: the employer link on contacts AND their
// positions moves (losing a job's employer silently corrupts employment
// history), company edges re-point, edges that become duplicates or self-loops
// are cleaned up (else the graph double-shows a relationship / a company relates
// to itself), and the user's chosen name/domain/sector wins.
describe("mergeCompanies re-points every reference and applies the resolution", () => {
  it("moves contacts + positions + edges to the target, dedups, applies fields, deletes sources", async () => {
    const tag = token();
    const { id: target } = await createCompany({ name: `Target ${tag}` });
    const { id: source } = await createCompany({ name: `Source ${tag}` });

    // Employed at SOURCE — contact AND its position row carry company_id = source.
    const employee = await createContact(person("Merge Employee", `Source ${tag}`), "manual");
    expect(await contactCompanyId(employee)).toBe(source);
    expect(await positionCompanyIds(employee)).toEqual([source]);

    const db = await getDb();
    const witness = await createContact(person("Edge Witness", null), "manual");
    await db.insert(edges).values([
      // Same predicate to each company: after re-point these become identical.
      { id: randomUUID(), srcType: "contact", srcId: witness, predicate: "worked_with", dstType: "company", dstId: target, sourceNoteId: null },
      { id: randomUUID(), srcType: "contact", srcId: witness, predicate: "worked_with", dstType: "company", dstId: source, sourceNoteId: null },
      // source → target: after re-point becomes target → target, a self-loop.
      { id: randomUUID(), srcType: "company", srcId: source, predicate: "partners_with", dstType: "company", dstId: target, sourceNoteId: null },
    ]);

    const result = await mergeCompanies({
      targetId: target, sourceIds: [source], name: `Merged ${tag}`, domain: "merged.example", sector: "Widgets",
    });
    expect(result.targetId).toBe(target);

    // Employer link + employment history both point at the survivor now.
    expect(await contactCompanyId(employee)).toBe(target);
    expect(await positionCompanyIds(employee)).toEqual([target]);

    // The two now-identical contact→company edges collapsed to exactly one.
    const workedWith = await db.select().from(edges).where(
      and(isNull(edges.deletedAt), eq(edges.predicate, "worked_with"), eq(edges.dstType, "company"), eq(edges.dstId, target)),
    );
    expect(workedWith).toHaveLength(1);

    // The company→company edge became a self-loop and was removed.
    const selfEdges = await db.select().from(edges).where(
      and(isNull(edges.deletedAt), eq(edges.srcType, "company"), eq(edges.srcId, target), eq(edges.dstType, "company"), eq(edges.dstId, target)),
    );
    expect(selfEdges).toHaveLength(0);

    // The user's resolved identity landed on the survivor; the source is gone.
    const [merged] = await db.select().from(companies).where(eq(companies.id, target));
    expect(merged).toMatchObject({ name: `Merged ${tag}`, domain: "merged.example", sector: "Widgets" });
    const [gone] = await db.select().from(companies).where(eq(companies.id, source));
    expect(gone).toBeUndefined();
  });
});

// One transaction so a failure partway through — after references moved but
// before the losing rows are deleted — can't leave the graph half-merged. A
// throwaway FK to companies.id blocks the final delete and forces that exact
// mid-merge failure.
describe("mergeCompanies is all-or-nothing", () => {
  it("rolls back the whole merge when the source delete is blocked by an FK", async () => {
    const db = await getDb();
    await db.execute(sql`CREATE TABLE IF NOT EXISTS _test_unhandled_company_ref (
      id text PRIMARY KEY, company_id text NOT NULL REFERENCES companies(id)
    )`);
    try {
      const tag = token();
      const { id: target } = await createCompany({ name: `Atomic Target ${tag}` });
      const { id: source } = await createCompany({ name: `Atomic Source ${tag}` });
      const employee = await createContact(person("Atomic Employee", `Atomic Source ${tag}`), "manual");
      expect(await contactCompanyId(employee)).toBe(source);

      // Blocks `delete companies where id in (source)`, aborting the txn after
      // the contact/position/edge re-points already ran inside it.
      await db.execute(sql`INSERT INTO _test_unhandled_company_ref (id, company_id) VALUES (${randomUUID()}, ${source})`);

      await expect(
        mergeCompanies({ targetId: target, sourceIds: [source], name: `Atomic Merged ${tag}`, domain: null, sector: null }),
      ).rejects.toThrow();

      // Nothing moved: the employee (and their position) still point at the
      // intact source company.
      expect(await contactCompanyId(employee)).toBe(source);
      expect(await positionCompanyIds(employee)).toEqual([source]);
      const [survivor] = await db.select().from(companies).where(eq(companies.id, source));
      expect(survivor).toBeDefined();
    } finally {
      await db.execute(sql`DROP TABLE IF EXISTS _test_unhandled_company_ref`);
    }
  });
});

// Companies have RESTRICT FKs from contacts + positions, so deleting one must
// NOT take its people or their job history with it — the point is to drop the
// employer, not erase whoever worked there. Edges are tombstoned (recoverable).
describe("deleteCompany detaches people and jobs, then removes the company", () => {
  it("nulls company_id on contacts + positions (rows survive), soft-deletes edges, deletes the company", async () => {
    const tag = token();
    const { id: company } = await createCompany({ name: `Doomed ${tag}` });
    const employee = await createContact(person("Detach Employee", `Doomed ${tag}`), "manual");
    expect(await contactCompanyId(employee)).toBe(company);
    expect(await positionCompanyIds(employee)).toEqual([company]);

    const db = await getDb();
    const edgeId = randomUUID();
    await db.insert(edges).values({ id: edgeId, srcType: "contact", srcId: employee, predicate: "worked_with", dstType: "company", dstId: company, sourceNoteId: null });

    await deleteCompany(company);

    const [gone] = await db.select().from(companies).where(eq(companies.id, company));
    expect(gone).toBeUndefined();
    // Contact + its position survive, just detached — no data loss.
    expect(await contactCompanyId(employee)).toBeNull();
    expect(await positionCompanyIds(employee)).toEqual([null]);
    // The company edge is tombstoned, not hard-deleted.
    const [edge] = await db.select().from(edges).where(eq(edges.id, edgeId));
    expect(edge?.deletedAt).not.toBeNull();
  });

  it("throws for a company that does not exist (fail loud, not a silent no-op)", async () => {
    await expect(deleteCompany(`missing-${randomUUID()}`)).rejects.toThrow();
  });
});

// createCompany is the single choke point for creation, so it must absorb the
// same name twice into one row (a duplicate employer is a data-model bug, not
// two companies) — case-insensitively, since users type casing inconsistently.
describe("createCompany de-dupes on a case-insensitive name", () => {
  it("returns the existing id and writes no second row for a name that already exists", async () => {
    const name = `Dedupe ${token()}`;
    const { id: first } = await createCompany({ name });
    const { id: second } = await createCompany({ name: name.toUpperCase() });
    expect(second).toBe(first);
    const db = await getDb();
    const rows = await db.select({ id: companies.id }).from(companies).where(ilike(companies.name, name));
    expect(rows).toHaveLength(1);
  });
});

// The duplicate finder lets a user reconcile "Acme Inc." vs "Acme": variants
// differing only by a legal suffix must land in one cluster, while a company
// with no twin must never appear (a false positive pushes a bad merge).
describe("findDuplicateCompanyClusters groups legal-suffix variants, excludes singletons", () => {
  it("clusters 'Zeta… Inc.' with 'Zeta…' and leaves a unique company out", async () => {
    const tag = token();
    const { id: a } = await createCompany({ name: `Zeta${tag} Inc.` });
    const { id: b } = await createCompany({ name: `Zeta${tag}` });
    const { id: solo } = await createCompany({ name: `Solo${tag} Corporation` });

    const clusters = await findDuplicateCompanyClusters();
    const mine = clusters.find((c) => c.normalizedName === `zeta${tag}`);
    expect(mine).toBeDefined();
    expect(mine?.companies.map((c) => c.id).sort()).toEqual([a, b].sort());
    expect(clusters.some((c) => c.companies.some((co) => co.id === solo))).toBe(false);
  });
});

// Merging must not erase the losing company's identity: its former name has to
// survive as an alias of the survivor, so a later capture that still types the
// old name resolves back to the merged company instead of re-forking it. This is
// the write half of findOrCreateCompany's alias-resolution read.
describe("mergeCompanies records the losing company's name as an alias of the survivor", () => {
  it("keeps the old name resolvable by aliasing it onto the target", async () => {
    const tag = token();
    const { id: target } = await createCompany({ name: `Survivor ${tag}` });
    const { id: source } = await createCompany({ name: `Gone ${tag}` });

    await mergeCompanies({
      targetId: target, sourceIds: [source], name: `Survivor ${tag}`, domain: null, sector: null,
    });

    // WHY: without this alias a re-capture of "Gone <tag>" would mint a brand-new
    // company, silently undoing the merge — the losing name must point at the survivor.
    const db = await getDb();
    const aliases = await db
      .select({ alias: companyAliases.alias })
      .from(companyAliases)
      .where(eq(companyAliases.companyId, target));
    expect(aliases.map((a) => a.alias)).toContain(`Gone ${tag}`);
  });
});
