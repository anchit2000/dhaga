import { GRAPH_TAG_MERGE_CEILING, GRAPH_TAG_SPOKE_CAP } from "@/utils/constants/graph";

/**
 * Client-side hard stop for per-tag spoke loads on a truncated tag graph.
 * Every merged tag edge costs reducer time on every sweep, so accumulated
 * click-to-load fetches must never recreate the pathology the server budget
 * exists to prevent. A load whose worst case (true memberCount clamped to the
 * per-fetch spoke cap) would push the running total past the ceiling is
 * refused outright — fail loud with a toast, never degrade the frame rate.
 */
export function spokeLoadAllowed(mergedEdgeCount: number, memberCount: number): boolean {
  const incoming = Math.min(memberCount, GRAPH_TAG_SPOKE_CAP);
  return mergedEdgeCount + incoming <= GRAPH_TAG_MERGE_CEILING;
}
