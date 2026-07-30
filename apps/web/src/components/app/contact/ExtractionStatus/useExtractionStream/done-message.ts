import type { ExtractionJobKind } from "@/types";

function counted(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}

/**
 * The one sentence a finished job gets, shared by the completion toast and the
 * in-page confirmation so the two can never drift. Counts come from the job's
 * own recorded totals — when they're zero it says so rather than implying
 * something landed.
 */
export function extractionDoneMessage(job: {
  kind: ExtractionJobKind;
  factCount: number;
  followUpCount: number;
}): string {
  const lead = job.kind === "enrichment" ? "Enrichment finished" : "Extraction finished";
  const added: string[] = [];
  if (job.factCount > 0) added.push(counted(job.factCount, "fact", "facts"));
  if (job.followUpCount > 0) added.push(counted(job.followUpCount, "follow-up", "follow-ups"));
  if (added.length === 0) return `${lead} — nothing new to add.`;
  return `${lead} — ${added.join(" and ")} added.`;
}
