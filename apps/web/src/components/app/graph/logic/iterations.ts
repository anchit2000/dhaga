import { GRAPH_FA2_ITERATION_TIERS } from "@/utils/constants/graph";

/**
 * Iteration budget scales DOWN as node count grows: small graphs converge
 * cheaply so they can afford polish; at 20k nodes each iteration costs
 * ~135ms, so the budget is what keeps layout inside the 15s contract.
 */
export function fa2IterationsFor(nodeCount: number): number {
  for (const [maxNodes, iterations] of GRAPH_FA2_ITERATION_TIERS) {
    if (nodeCount <= maxNodes) return iterations;
  }
  return GRAPH_FA2_ITERATION_TIERS[GRAPH_FA2_ITERATION_TIERS.length - 1][1];
}
