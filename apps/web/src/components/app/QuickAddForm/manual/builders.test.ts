import { describe, expect, it } from "vitest";
import type { GraphTarget } from "@/lib/repo/graph-data";
import {
  buildFactFormData,
  buildFollowUpFormData,
  buildRelationshipInput,
  canSubmitRelationship,
} from "./builders";

const ada: GraphTarget = { id: "c-ada", label: "Ada Lovelace", kind: "contact", sublabel: null };
const alan: GraphTarget = { id: "c-alan", label: "Alan Turing", kind: "contact", sublabel: null };

describe("canSubmitRelationship", () => {
  it("stays disabled until both endpoints AND a predicate are picked", () => {
    // WHY: an edge is meaningless with one endpoint or no predicate. The form's
    // submit button binds to this, so a half-filled relationship can't be written.
    expect(canSubmitRelationship(null, null, null)).toBe(false);
    expect(canSubmitRelationship(ada, null, "mentor_of")).toBe(false);
    expect(canSubmitRelationship(ada, alan, null)).toBe(false);
    expect(canSubmitRelationship(ada, alan, "mentor_of")).toBe(true);
  });
});

describe("buildRelationshipInput", () => {
  it("writes a contact↔contact edge subject→object with the predicate slug", () => {
    expect(buildRelationshipInput(ada, alan, "mentor_of", false)).toEqual({
      srcId: "c-ada",
      srcKind: "contact",
      dstId: "c-alan",
      dstKind: "contact",
      predicate: "mentor_of",
    });
  });

  it("flips only the endpoints, never the predicate, when direction is swapped", () => {
    // WHY: the Swap toggle changes who points at whom; keeping the same slug is
    // what makes "Ada mentor_of Alan" vs "Alan mentor_of Ada" a direction choice.
    const flipped = buildRelationshipInput(ada, alan, "mentor_of", true);
    expect(flipped.srcId).toBe("c-alan");
    expect(flipped.dstId).toBe("c-ada");
    expect(flipped.predicate).toBe("mentor_of");
  });
});

describe("fact & follow-up form-data builders", () => {
  it("injects the picked contactId a fact form can't supply on its own", () => {
    const fd = buildFactFormData("c-ada", "Loves Babbage's engine", "personal");
    expect(fd.get("contactId")).toBe("c-ada");
    expect(fd.get("type")).toBe("personal");
    expect(fd.get("text")).toBe("Loves Babbage's engine");
  });

  it("serializes a follow-up due date as ISO and omits it when unset", () => {
    const due = new Date("2026-08-01T09:00:00.000Z");
    const withDate = buildFollowUpFormData("c-ada", "Send notes", due);
    expect(withDate.get("contactId")).toBe("c-ada");
    expect(withDate.get("action")).toBe("Send notes");
    expect(withDate.get("dueDate")).toBe("2026-08-01T09:00:00.000Z");
    expect(buildFollowUpFormData("c-ada", "Send notes", null).get("dueDate")).toBeNull();
  });
});
