import { describe, expect, it } from "vitest";
import { isActive } from "./live-state";
import { applyEvent, applyStatus, markStalled } from "./reducers";
import { isVisible, mergeLiveState } from "./merge";
import { extractionDoneMessage } from "./done-message";
import type { ExtractionJobView } from "@/types";
import type { LiveState } from "./live-state";

/**
 * What these guard: the person page renders extraction progress over a SERVER
 * job list snapshotted before the worker ran. Live state is therefore the only
 * thing that can settle a job before the next revalidation, so EVERY terminal
 * outcome has to fold into it. The regression they exist to catch is the reported
 * bug — a finished job still saying "extracting…" until the user reloads.
 */
const NO_CLEARED: ReadonlySet<string> = new Set<string>();

function pendingJob(overrides: Partial<ExtractionJobView> = {}): ExtractionJobView {
  return {
    id: "job-1",
    kind: "note_extraction",
    status: "pending",
    stage: null,
    error: null,
    factCount: 0,
    followUpCount: 0,
    stalled: false,
    ...overrides,
  };
}

/** Exactly what ExtractionStatus renders: the hook's merge, then its filter. */
function rendered(
  jobs: ExtractionJobView[],
  live: LiveState,
  cleared: ReadonlySet<string> = NO_CLEARED,
): ExtractionJobView[] {
  return mergeLiveState(jobs, live, cleared).filter(isVisible);
}

describe("a finished job stops claiming it is still working", () => {
  it("clears the active spinner the moment the stream reports done — no reload", () => {
    const jobs = [pendingJob()];
    const live = applyEvent({}, "job-1", { type: "done", factCount: 4, followUpCount: 1 });

    const visible = rendered(jobs, live);

    expect(jobs[0].status).toBe("pending"); // the server list is still stale
    expect(visible.some(isActive)).toBe(false);
    expect(visible).toHaveLength(1);
    expect(visible[0].status).toBe("done");
    expect(visible[0].factCount).toBe(4);
    expect(visible[0].followUpCount).toBe(1);
  });

  it("leaves a receipt of what landed, then clears itself", () => {
    const live = applyEvent({}, "job-1", { type: "done", factCount: 4, followUpCount: 1 });
    expect(extractionDoneMessage(rendered([pendingJob()], live)[0])).toBe(
      "Extraction finished — 4 facts and 1 follow-up added.",
    );
    // After the confirmation timer fires: gone. Brief, never a standing banner.
    expect(rendered([pendingJob()], live, new Set(["job-1"]))).toHaveLength(0);
  });

  it("says nothing about a job that finished before this page view", () => {
    // A recently-done job from another session would be news about nothing.
    expect(rendered([pendingJob({ status: "done", factCount: 3 })], {})).toHaveLength(0);
  });

  it("settles an error outcome into its retryable notice", () => {
    const visible = rendered(
      [pendingJob()],
      applyEvent({}, "job-1", { type: "error", message: "Extraction failed.", retryable: true }),
    );
    expect(visible.some(isActive)).toBe(false);
    expect(visible[0].status).toBe("error");
    expect(visible[0].error).toBe("Extraction failed.");
  });

  it("settles a blocked outcome into its paid-feature notice", () => {
    const visible = rendered(
      [pendingJob()],
      applyEvent({}, "job-1", { type: "blocked", message: "Paid feature." }),
    );
    expect(visible.some(isActive)).toBe(false);
    expect(visible[0].status).toBe("blocked");
  });
});

describe("jobs this tab cannot stream still settle", () => {
  it("clears the spinner and names the counts off a polled done row", () => {
    const live = applyStatus({}, "job-1", {
      id: "job-1",
      stage: null,
      status: "done",
      factCount: 2,
      followUpCount: 0,
    });
    const visible = rendered([pendingJob()], live);
    expect(visible.some(isActive)).toBe(false);
    expect(extractionDoneMessage(visible[0])).toBe("Extraction finished — 2 facts added.");
  });

  it("keeps a live writing count instead of regressing to a running row's zero", () => {
    const writing = applyEvent({}, "job-1", { type: "stage", stage: "writing", count: 5 });
    const live = applyStatus(writing, "job-1", {
      id: "job-1",
      stage: "extracting",
      status: "running",
      factCount: 0,
      followUpCount: 0,
    });
    expect(live["job-1"].count).toBe(5);
  });

  it("turns giving up on a job into a retryable notice, not an endless spinner", () => {
    // The bounded poll hit its deadline with no terminal status: this tab has
    // stopped watching, so a spinner would be a lie about live progress.
    const live = markStalled(
      applyEvent({}, "job-1", { type: "stage", stage: "extracting" }),
      "job-1",
    );
    expect(rendered([pendingJob()], live)[0].stalled).toBe(true);
  });

  it("never reopens a job that already finished", () => {
    const done = applyEvent({}, "job-1", { type: "done", factCount: 1, followUpCount: 0 });
    expect(markStalled(done, "job-1")).toBe(done);
  });
});

describe("completion copy states exactly what landed", () => {
  it.each([
    [{ factCount: 1, followUpCount: 0 }, "Extraction finished — 1 fact added."],
    [{ factCount: 4, followUpCount: 0 }, "Extraction finished — 4 facts added."],
    [{ factCount: 0, followUpCount: 2 }, "Extraction finished — 2 follow-ups added."],
    [{ factCount: 2, followUpCount: 1 }, "Extraction finished — 2 facts and 1 follow-up added."],
    // Honesty over cheer: a job that added nothing must not imply it did.
    [{ factCount: 0, followUpCount: 0 }, "Extraction finished — nothing new to add."],
  ])("renders %o", (counts, expected) => {
    expect(extractionDoneMessage({ kind: "note_extraction", ...counts })).toBe(expected);
  });

  it("names enrichment as enrichment", () => {
    expect(extractionDoneMessage({ kind: "enrichment", factCount: 3, followUpCount: 0 })).toBe(
      "Enrichment finished — 3 facts added.",
    );
  });
});
