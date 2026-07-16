/** Wire protocol between the layout runner and fa2.worker — kept in one file
 *  so both sides type-check against the same shapes. */

export interface LayoutRequest {
  type: "layout";
  /** Node index i owns positions[2i], positions[2i+1]. */
  positions: Float64Array;
  /** Edge pairs as node indices: [src0, dst0, src1, dst1, ...]. */
  edges: Uint32Array;
  iterations: number;
}

export interface LayoutProgress {
  type: "progress";
  /** 0..1 share of requested iterations completed. */
  done: number;
}

export interface LayoutDone {
  type: "done";
  positions: Float64Array;
}

export type WorkerReply = LayoutProgress | LayoutDone;
