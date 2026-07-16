import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { eq } from "drizzle-orm";
import { emptyExtractedContact } from "@dhaga/core";
import { getDb } from "@/lib/db/request-scope";
import { KG_DDL } from "@/lib/db/ddl/kg";
import { edges } from "@/lib/db/schema";
import type { PGlite } from "@electric-sql/pglite";
import { createContact } from "@/lib/repo/contacts";
import { createRelationshipType } from "@/lib/repo/relationship-types";
import {
  createRelationshipEdge,
  deleteRelationshipEdge,
  listContactRelationships,
  validateRelationshipInput,
} from "@/lib/repo/relationships";
import type { RelationshipInput } from "@/lib/repo/relationships";

const valid: RelationshipInput = {
  srcId: "src-1",
  srcKind: "contact",
  dstId: "dst-1",
  dstKind: "entity",
  predicate: "member_of",
};

/**
 * Manual relationships come straight from client input — the validation gate
 * is what keeps junk predicates out of the edges table, where they'd be
 * stored forever and rendered on every graph load.
 */
describe("validateRelationshipInput", () => {
  it("accepts a well-formed input", () => {
    expect(validateRelationshipInput(valid)).toBeNull();
  });

  it("rejects predicates that are not snake_case slugs", () => {
    for (const predicate of ["Father Of", "1bad", "bad__slug", "bad_", "_bad", ""]) {
      expect(validateRelationshipInput({ ...valid, predicate })).not.toBeNull();
    }
  });

  it("rejects unknown endpoint kinds (runtime junk, not just TS)", () => {
    const junk = { ...valid, dstKind: "person" as RelationshipInput["dstKind"] };
    expect(validateRelationshipInput(junk)).not.toBeNull();
  });

  it("rejects self-loops and missing endpoints", () => {
    expect(validateRelationshipInput({ ...valid, dstId: valid.srcId })).not.toBeNull();
    expect(validateRelationshipInput({ ...valid, dstId: "" })).not.toBeNull();
  });
});

describe("manual relationship edges", () => {
  it("writes with a NULL receipt so no note delete can ever tombstone it, and delete tombstones", async () => {
    const db = await getDb();
    const ravi = await createContact({ ...emptyExtractedContact(), name: "Ravi Manual" }, "manual");
    const sona = await createContact({ ...emptyExtractedContact(), name: "Sona Manual" }, "manual");
    const edgeId = await createRelationshipEdge({
      srcId: ravi,
      srcKind: "contact",
      dstId: sona,
      dstKind: "contact",
      predicate: "father_of",
    });

    const [row] = await db.select().from(edges).where(eq(edges.id, edgeId));
    // WHY: a manual edge has no source note — a non-null receipt would let an
    // unrelated note deletion silently retire a relationship the user typed in.
    expect(row.sourceNoteId).toBeNull();
    expect(row).toMatchObject({ srcType: "contact", dstType: "contact", predicate: "father_of" });

    await deleteRelationshipEdge(edgeId);
    const [after] = await db.select().from(edges).where(eq(edges.id, edgeId));
    expect(after.deletedAt).not.toBeNull();
    expect(await listContactRelationships(ravi)).toHaveLength(0);
  });

  it("labels a manual edge with the user-defined predicate from both ends", async () => {
    await createRelationshipType({
      slug: "godparent_of",
      forwardLabel: "godparent of",
      inverseLabel: "godchild of",
    });
    const uma = await createContact({ ...emptyExtractedContact(), name: "Uma Custom" }, "manual");
    const venu = await createContact({ ...emptyExtractedContact(), name: "Venu Custom" }, "manual");
    await createRelationshipEdge({
      srcId: uma,
      srcKind: "contact",
      dstId: venu,
      dstKind: "contact",
      predicate: "godparent_of",
    });

    // One stored edge, read from each end with the custom labels — the same
    // invariant the built-in role map guarantees for known predicates.
    const fromUma = await listContactRelationships(uma);
    expect(fromUma).toHaveLength(1);
    expect(fromUma[0].role).toBe("godchild of");
    const fromVenu = await listContactRelationships(venu);
    expect(fromVenu).toHaveLength(1);
    expect(fromVenu[0].role).toBe("godparent of");
  });
});

/**
 * Readers now filter on dst_type/src_type = 'contact' only. Databases written
 * before this rewrite hold 'person' rows — the boot DDL must rewrite them or
 * every pre-existing relationship silently disappears from the contact page.
 */
describe("legacy 'person' endpoint normalization (DDL self-heal)", () => {
  it("rewrites stored person endpoints to contact on the next boot", async () => {
    const db = await getDb();
    const wero = await createContact({ ...emptyExtractedContact(), name: "Wero Legacy" }, "manual");
    const xena = await createContact({ ...emptyExtractedContact(), name: "Xena Legacy" }, "manual");
    const legacyId = randomUUID();
    await db.insert(edges).values({
      id: legacyId,
      srcType: "contact",
      srcId: wero,
      predicate: "knows",
      dstType: "person",
      dstId: xena,
    });
    // Invisible to the normalized readers until healed…
    expect(await listContactRelationships(wero)).toHaveLength(0);

    // Re-apply the shipped DDL through the same multi-statement exec the boot
    // path uses (lib/db/index.ts caches the PGlite client on globalThis;
    // drizzle's execute() is single-statement, so it can't replay a boot).
    const client = (globalThis as { __dhagaClient?: PGlite }).__dhagaClient;
    expect(client).toBeDefined();
    await client!.exec(KG_DDL);

    const [row] = await db.select().from(edges).where(eq(edges.id, legacyId));
    expect(row.dstType).toBe("contact");
    expect(await listContactRelationships(wero)).toHaveLength(1);
  });
});
