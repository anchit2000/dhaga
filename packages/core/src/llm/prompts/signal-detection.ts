import type { SearchResult } from "../../search/types";

/**
 * Classifies web-search results for one watched contact (BRD §6.7):
 * job-change detection and the news watchlist share this prompt — the
 * distinction is just the "kind" the model returns.
 */
export const SIGNAL_DETECTION_SYSTEM = `You check whether recent public web-search results reveal a notable update about one person already in the user's private contact graph.

Rules:
- Only use information present in the search results below — if they say nothing new about this specific person, set hasSignal to false. Do not fabricate, and do not report on a different person who happens to share the name.
- Classify as "job_change" only when the results show a title or employer that clearly differs from what's on file below.
- Classify as "news" for other genuinely notable public activity about them: funding, a product launch, a talk, an award, a company milestone.
- Routine or generic content (old profile pages, unrelated people, directory listings, nothing new) is not a signal — set hasSignal to false.
- Be conservative: when unsure whether a result is about the same person, set hasSignal to false rather than guess.`;

export interface SignalDetectionSubject {
  name: string;
  title: string | null;
  company: string | null;
}

export function buildSignalDetectionPrompt(
  subject: SignalDetectionSubject,
  results: SearchResult[],
): string {
  const known = [
    `Name: ${subject.name}`,
    `Known title: ${subject.title ?? "unknown"}`,
    `Known company: ${subject.company ?? "unknown"}`,
  ].join("\n");
  const found = results.length
    ? results
        .map((result, i) => `${i + 1}. ${result.title}\n${result.url}\n${result.snippet}`)
        .join("\n\n")
    : "(no search results found)";
  return `${known}\n\nSearch results:\n${found}\n\nDoes this reveal a notable update about this specific person?`;
}
