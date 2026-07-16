/**
 * Hover refresh gate for the sigma canvas — one state machine for two
 * measured problems:
 *
 * 1. Drag-pan churn: while the camera is dragged, nodes stream under the
 *    cursor and sigma fires enterNode/leaveNode for each; every one used to
 *    trigger a full O(N+E) reducer sweep (measured: 17.4 avg / 2.1 p5 fps,
 *    583ms worst frame at 63k edges). Pointer down suppresses hover entirely
 *    — and clears any active hover with ONE sweep — until pointer up.
 * 2. Event bursts: several enter/leave can land between two frames even
 *    without a drag. Hover writes are staged and flushed at most once per
 *    animation frame; a burst that nets out to the applied value flushes
 *    nothing at all.
 *
 * Pure logic with an injectable scheduler so the machine is unit-testable;
 * the sigma/DOM wiring lives in use-renderer.ts. Click selection is
 * untouched: sigma emits clickNode from its own no-drag down+up detection,
 * which never routes through this gate.
 */

export interface HoverGate {
  /** sigma enterNode — stage a hover, coalesced to one apply per frame. */
  enter(nodeId: string): void;
  /** sigma leaveNode — stage a clear, coalesced with enter() above. */
  leave(): void;
  /** Container pointerdown: clear any applied hover now, ignore enter/leave
   *  until pointerUp. */
  pointerDown(): void;
  /** Window pointerup/pointercancel: resume staging. */
  pointerUp(): void;
  /** Cancel any scheduled flush (sigma teardown). */
  dispose(): void;
}

export function createHoverGate(
  apply: (hoveredId: string | null) => void,
  schedule: (flush: () => void) => number = (flush) => requestAnimationFrame(flush),
  cancel: (handle: number) => void = (handle) => cancelAnimationFrame(handle),
): HoverGate {
  let applied: string | null = null;
  let staged: string | null = null;
  let handle: number | null = null;
  let suppressed = false;

  const flush = (): void => {
    handle = null;
    if (staged === applied) return; // the burst netted out — skip the sweep
    applied = staged;
    apply(applied);
  };
  const stage = (nodeId: string | null): void => {
    if (suppressed) return;
    staged = nodeId;
    handle ??= schedule(flush);
  };
  const cancelPending = (): void => {
    if (handle !== null) {
      cancel(handle);
      handle = null;
    }
  };

  return {
    enter: (nodeId) => stage(nodeId),
    leave: () => stage(null),
    pointerDown(): void {
      suppressed = true;
      staged = null;
      cancelPending();
      if (applied !== null) {
        applied = null;
        apply(null); // one clearing sweep, not one per node dragged across
      }
    },
    pointerUp(): void {
      suppressed = false;
    },
    dispose: cancelPending,
  };
}
