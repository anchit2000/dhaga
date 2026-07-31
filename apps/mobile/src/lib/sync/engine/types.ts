import type { SyncConflictReport } from "@dhaga/core/src/api/sync";
import type { SyncContainer } from "@dhaga/core/src/sync/types";
import type { SyncWriteFailure } from "../writes";

/** The steps a run reports, in order, so the screen can name what it is doing. */
export type SyncPhase = "permission" | "reading" | "pushing" | "writing" | "confirming";

/**
 * Which push request is in flight when an address book is too large to ship in
 * one. Reported only while it is true — a lone chunk sends nothing, because
 * "(1 of 1)" tells the user nothing they wanted to know.
 */
export interface SyncProgress {
  chunk: number;
  total: number;
}

/**
 * How the engine reports where it has got to. Progress rides the phase it
 * belongs to rather than a second channel: the screen already renders one line
 * for "what is happening now", and a large sync is the same steps, longer.
 */
export type SyncPhaseHandler = (phase: SyncPhase, progress?: SyncProgress) => void;

export interface SyncRunResult {
  /** Contacts read from the chosen container and sent to the server. */
  observed: number;
  /** Address-book records created / patched on this device. */
  created: number;
  updated: number;
  /** Server-side counts, echoed straight from the push response. */
  pulled: number;
  createdInDhaga: number;
  linked: number;
  /**
   * Dhaga contacts this run was not allowed to offer because it hit the server's
   * per-run create ceiling. Shown, never acted on: the next run drains them, and
   * retrying automatically would write to the address book without being asked.
   */
  remaining: number;
  /** Divergences the server could not resolve. Shown, never hidden. */
  conflicts: SyncConflictReport[];
  /** Writes that could not be applied to the device. */
  failures: SyncWriteFailure[];
  container: SyncContainer | null;
  /** Why writes may not reach the user's other devices, or null when they will. */
  notice: string | null;
}

/**
 * A denied permission is a first-class outcome, not an error: the user said no,
 * and the screen has a different thing to offer them (Settings) than it does
 * for a failure.
 */
export type SyncOutcome =
  | { kind: "done"; result: SyncRunResult }
  | { kind: "denied"; canAskAgain: boolean }
  | { kind: "error"; message: string };
