import { describe, expect, it } from "vitest";
import {
  ENRICHMENT_EXTRACTION_SYSTEM,
  NOTE_EXTRACTION_SYSTEM,
  buildEnrichmentExtractionPrompt,
  buildNoteExtractionPrompt,
  relationshipSchema,
} from "@dhaga/core";

const registry = [
  { name: "Gym", slug: "gym" },
  { name: "School", slug: "school" },
];

describe("extraction schema carries custom-entity objects", () => {
  // WHY: the extractor can only propose entity links if the structured-output
  // schema admits them — and strict-mode providers (OpenAI's zodResponseFormat)
  // reject .optional(), so the hint must be required-but-nullable.
  it("accepts an entity object with a node-type hint", () => {
    const parsed = relationshipSchema.parse({
      subject: "contact",
      predicate: "trains_at",
      object: "Iron Temple",
      object_type: "entity",
      entity_type_hint: "gym",
    });
    expect(parsed.object_type).toBe("entity");
    expect(parsed.entity_type_hint).toBe("gym");
  });

  it("keeps person/company relationships valid with a null hint", () => {
    const parsed = relationshipSchema.parse({
      subject: "contact",
      predicate: "knows",
      object: "Ajay",
      object_type: "person",
      entity_type_hint: null,
    });
    expect(parsed.entity_type_hint).toBeNull();
  });

  it("rejects object types outside company/person/entity", () => {
    expect(() =>
      relationshipSchema.parse({
        subject: "contact",
        predicate: "orbits",
        object: "Mars",
        object_type: "planet",
        entity_type_hint: null,
      }),
    ).toThrow();
  });
});

describe("node-type registry rides in the volatile user prompt only", () => {
  // WHY: prompt caching — the system prefix must stay byte-identical across
  // users and calls; anything per-user (the registry) belongs in the user turn.
  it("note prompt lists the registry; the system prompt never does", () => {
    const prompt = buildNoteExtractionPrompt("Sam", "joined Iron Temple", registry);
    expect(prompt).toContain("Gym (slug: gym)");
    expect(prompt).toContain("School (slug: school)");
    expect(NOTE_EXTRACTION_SYSTEM).not.toContain("Gym (slug: gym)");
  });

  it("an empty registry degrades to exactly the registry-free prompt", () => {
    const withDefault = buildNoteExtractionPrompt("Sam", "met at a conference");
    expect(withDefault).toBe(buildNoteExtractionPrompt("Sam", "met at a conference", []));
    expect(withDefault).not.toContain("custom node types");
  });

  it("the enrichment prompt threads the registry the same way", () => {
    const prompt = buildEnrichmentExtractionPrompt("Sam", "findings text", registry);
    expect(prompt).toContain("Gym (slug: gym)");
    expect(ENRICHMENT_EXTRACTION_SYSTEM).not.toContain("Gym (slug: gym)");
    expect(buildEnrichmentExtractionPrompt("Sam", "findings text")).not.toContain(
      "custom node types",
    );
  });

  it("keeps the anti-fabrication rule in both system prompts", () => {
    expect(NOTE_EXTRACTION_SYSTEM).toContain("do not fabricate");
    expect(ENRICHMENT_EXTRACTION_SYSTEM).toContain("Do not invent");
  });
});
