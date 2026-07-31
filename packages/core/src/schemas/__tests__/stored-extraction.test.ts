import { describe, expect, it } from "vitest";
import { confirmationPayloadSchema } from "../confirmations";
import { relationshipSchema, storedRelationshipSchema } from "../extraction";

/**
 * WHY these exist: `relationshipSchema` serves two masters that want opposite
 * things.
 *
 * Outbound, it is the contract with the model — every field must be present and
 * `.nullable()` rather than `.optional()`, or the Zod-derived JSON schema stops
 * being strict-mode compatible for structured outputs.
 *
 * Inbound, the SAME schema is reused to read `confirmations.payload` rows back
 * out of Postgres. A row written before a field was added has it ABSENT, not
 * null — and `.nullable()` rejects `undefined`. That mismatch threw inside the
 * inbox's row `map()`, which took out /app/confirmations and Home with it.
 *
 * So: the strict schema must STAY strict (first test), and the stored variant
 * must tolerate the gap (rest). If someone "simplifies" these back into one
 * schema, one of these two tests fails — which is the point.
 */

/** A relationship as written before role/affiliation fields existed. */
const LEGACY_RELATIONSHIP = {
  subject: "contact",
  predicate: "works_at",
  object: "Northbridge",
  object_type: "company",
  entity_type_hint: null,
} as const;

describe("relationshipSchema (the model contract) stays strict", () => {
  it("rejects a relationship missing the late-added fields", () => {
    // Not a nicety: if this ever passes, the fields have been made .optional()
    // and the structured-output JSON schema is no longer strict-mode valid.
    const result = relationshipSchema.safeParse(LEGACY_RELATIONSHIP);
    expect(result.success).toBe(false);
  });
});

describe("storedRelationshipSchema (the read path) tolerates older rows", () => {
  it("defaults every absent late-added field to null", () => {
    const result = storedRelationshipSchema.safeParse(LEGACY_RELATIONSHIP);
    expect(result.success).toBe(true);
    if (!result.success) return;
    // null, not undefined — downstream resolvers branch on `=== false` /
    // `!== true`, so an undefined here would silently change graph behaviour
    // rather than fail loudly.
    expect(result.data.object_is_named).toBeNull();
    expect(result.data.role_title).toBeNull();
    expect(result.data.is_current).toBeNull();
    expect(result.data.started_at).toBeNull();
    expect(result.data.ended_at).toBeNull();
  });

  it("does not overwrite values that ARE present", () => {
    const result = storedRelationshipSchema.safeParse({
      ...LEGACY_RELATIONSHIP,
      object_is_named: true,
      role_title: "Head of Product",
      is_current: false,
      started_at: "2023",
      ended_at: "2024-06",
    });
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.data.object_is_named).toBe(true);
    expect(result.data.role_title).toBe("Head of Product");
    expect(result.data.is_current).toBe(false);
    expect(result.data.started_at).toBe("2023");
    expect(result.data.ended_at).toBe("2024-06");
  });
});

describe("a stored supplement confirmation carrying a legacy relationship", () => {
  it("parses — this exact payload shape 500'd the inbox and Home", () => {
    const result = confirmationPayloadSchema.safeParse({
      type: "supplement",
      question: "Add these to Priya Nair?",
      options: [],
      apply: {
        kind: "apply_extraction",
        contactId: "c-1",
        extraction: {
          facts: [],
          relationships: [LEGACY_RELATIONSHIP],
          follow_ups: [],
          tags: [],
        },
      },
    });
    expect(result.success).toBe(true);
  });
});
