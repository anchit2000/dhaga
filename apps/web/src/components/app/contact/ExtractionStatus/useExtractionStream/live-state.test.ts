import { describe, expect, it } from "vitest";
import {
  applyEvent,
  applyStatus,
  isTerminalStatus,
  toStage,
  type JobStatusRow,
  type LiveState,
} from "./live-state";
import type { ExtractionJobStatus } from "@/types";

const JOB = "job-1";

/**
 * The claim-lost fallback: when a second tab's worker POST loses the atomic
 * claim, its stream emits `detached` and the tab reconciles by slow-polling the
 * status route. These reducers are what make that path correct — a detached
 * stream must NOT overwrite the shown state, and a polled status row must be
 * foldable so the tab shows the owner's live stage and detects completion (so it
 * can stop polling and refresh facts) without a manual reload.
 */
describe("extraction detached → fallback reconcile", () => {
  it("a detached stream writes nothing — the poll fallback owns reconciliation", () => {
    const prev: LiveState = {
      [JOB]: { status: "running", stage: "searching", count: 0, error: null },
    };
    const next = applyEvent(prev, JOB, { type: "detached" });
    // Same reference: if detached ever mutated state, the second tab would flash
    // a wrong/blank label instead of deferring to the status poll below.
    expect(next).toBe(prev);
  });

  it("folds a fallback status row so the second tab shows the owner's live stage", () => {
    const row: JobStatusRow = { id: JOB, stage: "searching", status: "running" };
    expect(applyStatus({}, JOB, row)[JOB]).toEqual({
      status: "running",
      stage: "searching",
      count: 0,
      error: null,
    });
  });

  it("recognizes a terminal 'done' row so the fallback stops and refreshes facts", () => {
    const row: JobStatusRow = { id: JOB, stage: null, status: "done" };
    const state = applyStatus({}, JOB, row)[JOB];
    expect(state.status).toBe("done");
    expect(isTerminalStatus(state.status)).toBe(true);
  });

  it("keeps polling while a job is still active (pending/running are non-terminal)", () => {
    for (const s of ["pending", "running"] as ExtractionJobStatus[]) {
      expect(isTerminalStatus(s)).toBe(false);
    }
    for (const s of ["done", "error", "blocked"] as ExtractionJobStatus[]) {
      expect(isTerminalStatus(s)).toBe(true);
    }
  });

  it("drops an unrecognized persisted stage rather than mislabeling the pill", () => {
    expect(toStage("searching")).toBe("searching");
    expect(toStage("bogus")).toBeNull();
    expect(toStage(null)).toBeNull();
  });
});
