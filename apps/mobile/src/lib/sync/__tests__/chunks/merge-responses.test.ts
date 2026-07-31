import { describe, expect, it } from "vitest";

import { mergePushResponses } from "../../engine/chunks";

import { response } from "./helpers";

describe("mergePushResponses", () => {
  it("reports a run that sent nothing as a run that did nothing", () => {
    expect(mergePushResponses([])).toEqual(response({}));
  });

  it("adds the counters and concatenates the work across chunks", () => {
    // Each chunk answers only for the contacts it carried, so the run's totals
    // exist nowhere but here — dropping a chunk's counts would under-report the
    // sync to the user, and dropping its writes would silently skip contacts.
    const merged = mergePushResponses([
      response({
        writes: [{ externalId: "ext-1", contactId: "c1", fields: { name: "A" }, etag: null }],
        pulled: 2,
        created: 1,
        linked: 3,
      }),
      response({
        writes: [{ externalId: null, contactId: "c2", fields: { name: "B" }, etag: null }],
        conflicts: [
          {
            contactId: "c3",
            contactName: "C",
            conflicts: [{ field: "name", kind: "both_edited", local: "C", remote: "C." }],
          },
        ],
        pulled: 5,
        created: 4,
        linked: 6,
      }),
    ]);

    expect(merged.writes.map((write) => write.contactId)).toEqual(["c1", "c2"]);
    expect(merged.conflicts).toHaveLength(1);
    expect(merged.pulled).toBe(7);
    expect(merged.created).toBe(5);
    expect(merged.linked).toBe(9);
  });

  it("carries the leftover creates the capped chunk reported", () => {
    // Only the final chunk asks to push outward, so exactly one response can
    // answer with a remainder — and it has to survive the merge. Dropping it
    // here would put the run back to silently handing the user 500 of 937 and
    // calling it done, which is the whole reason the field exists.
    const merged = mergePushResponses([response({}), response({ remaining: 437 })]);
    expect(merged.remaining).toBe(437);
  });
});
